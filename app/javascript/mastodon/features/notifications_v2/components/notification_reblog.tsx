import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import RepeatIcon from '@/material-icons/400-24px/repeat.svg?react';
import type { NotificationGroupReblog } from 'mastodon/models/notification_group';

import type { LabelRenderer } from './notification_group_with_status';
import { NotificationWithStatus } from './notification_with_status';

const labelRenderer: LabelRenderer = (displayedName, total, seeMoreHref) => {
  if (total === 1)
    return (
      <FormattedMessage
        id='notification.reblog'
        defaultMessage='{name} boosted your post'
        values={{ name: displayedName }}
      />
    );

  return (
    <FormattedMessage
      id='notification.reblog.name_and_others_with_link'
      defaultMessage='{name} and <a>{count, plural, one {# other} other {# others}}</a> boosted your post'
      values={{
        name: displayedName,
        count: total - 1,
        a: (chunks) =>
          seeMoreHref ? <Link to={seeMoreHref}>{chunks}</Link> : chunks,
      }}
    />
  );
};

export const NotificationReblog: React.FC<{
  notification: NotificationGroupReblog;
  unread: boolean;
}> = ({ notification, unread }) => (
  <NotificationWithStatus
    type='reblog'
    icon={RepeatIcon}
    iconId='repeat'
    accountIds={notification.sampleAccountIds}
    statusId={notification.statusId}
    count={notification.notifications_count}
    labelRenderer={labelRenderer}
    unread={unread}
  />
);
