import Queue from 'bull';

import processor from '~/server/tasks/processor';
import { isDev, isTest } from '~/common/utils/constants';
import { redisUrl, redisLongRunningOptions } from '~/server/services/redis';
import mailer, {
  prodTransporter,
  devTransporter,
} from '~/server/services/mailer';
import submitJob from '~/server/tasks/submitJob';

const mailing = new Queue('Send mails', redisUrl, {
  settings: redisLongRunningOptions,
});

const customTemplates = {
  'peoples-park-plinth': {
    subject:
      'It’s Time to Vote for the People’s Park Plinth at Furtherfield Gallery',
    subjectInvitation:
      'Activate Your Magical Voting Token for the People’s Park Plinth at Furtherfield Gallery',
  },
};

processor(mailing).process(
  async ({ data: { to, subject, template, data = {} } }) => {
    const send = mailer(isDev || isTest ? devTransporter : prodTransporter);
    return send(to, subject, template, data);
  },
);

export const testEmail = (to = 'me@example.org', data = { name: 'Meesix' }) =>
  submitJob(mailing, to, {
    subject: 'Testing the email sending',
    template: 'test',
    to,
    data,
  });

export const voteInvitationEmail = (to = 'me@example.org', data = {}) => {
  const templateName = Object.keys(customTemplates).includes(data.festivalSlug)
    ? data.festivalSlug
    : 'vote';
  return submitJob(mailing, `${to}#voteInvitation`, {
    subject:
      templateName === 'vote'
        ? 'Get Your Voting Token From Culturestake'
        : customTemplates[templateName].subject,
    template: `${templateName}-invitation`,
    to,
    data,
  });
};

export const voteEmail = (to = 'me@example.org', data = {}) => {
  const templateName = Object.keys(customTemplates).includes(data.festivalSlug)
    ? data.festivalSlug
    : 'vote';
  submitJob(mailing, `${to}#vote`, {
    subject:
      templateName === 'vote'
        ? 'Use Your Voting Token Now'
        : customTemplates[templateName].subjectInvitation,
    template: `${templateName}`,
    to,
    data,
  })
};

export default mailing;
