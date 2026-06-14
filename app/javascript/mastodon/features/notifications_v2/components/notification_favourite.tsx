import { FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import StarIcon from '@/material-icons/400-24px/star-fill.svg?react';
import type { NotificationGroupFavourite } from 'mastodon/models/notification_group';

import type { LabelRenderer } from './notification_group_with_status';
import { NotificationWithStatus } from './notification_with_status';

const labelRenderer: LabelRenderer = (displayedName, total, seeMoreHref) => {
  if (total === 1)
    return (
      <FormattedMessage
        id='notification.favourite'
        defaultMessage='{name} favorited your post'
        values={{ name: displayedName }}
      />
    );

  return (
    <FormattedMessage
      id='notification.favourite.name_and_others_with_link'
      defaultMessage='{name} and <a>{count, plural, one {# other} other {# others}}</a> favorited your post'
      values={{
        name: displayedName,
        count: total - 1,
        a: (chunks) =>
          seeMoreHref ? <Link to={seeMoreHref}>{chunks}</Link> : chunks,
      }}
    />
  );
};

export const NotificationFavourite: React.FC<{
  notification: NotificationGroupFavourite;
  unread: boolean;
}> = ({ notification, unread }) => (
  <NotificationWithStatus
    type='favourite'
    icon={StarIcon}
    iconId='star'
    accountIds={notification.sampleAccountIds}
    statusId={notification.statusId}
    count={notification.notifications_count}
    labelRenderer={labelRenderer}
    unread={unread}
  />
);
