import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import ArrowRightAltFillIcon from '@/material-icons/400-24px/arrow_right_alt-fill.svg?react';
import LockIcon from '@/material-icons/400-24px/lock.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';
import QuietTimeIcon from '@/material-icons/400-24px/quiet_time.svg?react';
import {
  changeCompose,
  changeComposeVisibility,
  resetCompose,
  submitCompose,
} from 'mastodon/actions/compose';
import { Icon } from 'mastodon/components/icon';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const LONG_PRESS_MS = 500;

const Ctx = createContext(null);

const VIS = ['public', 'unlisted', 'private'];
const VIS_ICON = {
  public: PublicIcon,
  unlisted: QuietTimeIcon,
  private: LockIcon,
};

const messages = defineMessages({
  placeholder: { id: 'compose_form.placeholder', defaultMessage: 'What is on your mind?' },
  publish: { id: 'compose_form.publish', defaultMessage: 'Post' },
  changePrivacy: { id: 'privacy.change', defaultMessage: 'Change post privacy' },
});

export const PublishLink = ({ className, children }) => {
  const { open } = useContext(Ctx);
  const timer = useRef(null);
  const longPressed = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      open();
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
  }, [open]);

  const handleTouchEnd = useCallback((e) => {
    clear();
    if (longPressed.current) {
      e.preventDefault();
    }
  }, [clear]);

  const handleClick = useCallback((e) => {
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
    }
  }, []);

  const handleContextMenu = useCallback((e) => {
    if (longPressed.current) e.preventDefault();
  }, []);

  return (
    <Link
      to='/publish'
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={clear}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {children}
    </Link>
  );
};

PublishLink.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

const Bar = ({ onClose }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const privacy = useAppSelector((s) => s.getIn(['compose', 'privacy'], 'public'));
  const isSubmitting = useAppSelector((s) => s.getIn(['compose', 'is_submitting']));
  const composeText = useAppSelector((s) => s.getIn(['compose', 'text']));
  const [text, setText] = useState('');
  const submitted = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, [onClose]);

  useEffect(() => {
    if (submitted.current && !isSubmitting && !composeText) {
      submitted.current = false;
      setText('');
      onClose();
    } else if (submitted.current && !isSubmitting) {
      submitted.current = false;
    }
  }, [isSubmitting, composeText, onClose]);

  const cyclePrivacy = useCallback(() => {
    const i = VIS.indexOf(privacy);
    const next = VIS[(i + 1) % VIS.length];
    dispatch(changeComposeVisibility(next));
  }, [privacy, dispatch]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isSubmitting) return;
    submitted.current = true;
    dispatch(changeCompose(text));
    dispatch(submitCompose());
  }, [text, isSubmitting, dispatch]);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
  }, []);

  const PrivacyIcon = VIS_ICON[privacy] ?? PublicIcon;

  return (
    <>
      <div className='simple-compose__backdrop' onClick={onClose} role='presentation' />
      <div className='simple-compose'>
        <button
          type='button'
          className='simple-compose__privacy'
          onClick={cyclePrivacy}
          title={intl.formatMessage(messages.changePrivacy)}
          aria-label={intl.formatMessage(messages.changePrivacy)}
        >
          <Icon id='privacy' icon={PrivacyIcon} />
        </button>
        <textarea
          ref={inputRef}
          className='simple-compose__input'
          value={text}
          onChange={handleChange}
          placeholder={intl.formatMessage(messages.placeholder)}
          rows={1}
          autoFocus
        />
        <button
          type='button'
          className='simple-compose__submit'
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          title={intl.formatMessage(messages.publish)}
          aria-label={intl.formatMessage(messages.publish)}
        >
          <Icon id='send' icon={ArrowRightAltFillIcon} />
        </button>
      </div>
    </>
  );
};

Bar.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export const SimpleComposeShell = ({ children }) => {
  const layout = useAppSelector((s) => s.getIn(['meta', 'layout']));
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  const openBar = useCallback(() => {
    if (layout !== 'mobile') return;
    dispatch(resetCompose());
    setOpen(true);
  }, [layout, dispatch]);

  const closeBar = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={{ open: openBar }}>
      {children}
      {layout === 'mobile' && open && <Bar onClose={closeBar} />}
    </Ctx.Provider>
  );
};

SimpleComposeShell.propTypes = {
  children: PropTypes.node,
};
