import classNames from 'classnames';
import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import ArrowRightAltFillIcon from '@/material-icons/400-24px/arrow_right_alt-fill.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import SettingsIcon from '@/material-icons/400-24px/settings.svg?react';
import {
  changeCompose,
  resetCompose,
  submitCompose,
} from 'mastodon/actions/compose';
import { CheckBox } from 'mastodon/components/check_box';
import { Icon } from 'mastodon/components/icon';
import { IconButton } from 'mastodon/components/icon_button';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const LONG_PRESS_MS = 500;

const Ctx = createContext(null);

const messages = defineMessages({
  placeholder: { id: 'compose_form.placeholder', defaultMessage: 'What is on your mind?' },
  publish: { id: 'compose_form.publish', defaultMessage: 'Post' },
  settings: { id: 'simple_compose.settings', defaultMessage: '簡易投稿の設定' },
  settingsTitle: { id: 'simple_compose.settings_title', defaultMessage: '設定' },
  autoClose: { id: 'simple_compose.auto_close', defaultMessage: '投稿後に閉じる' },
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
});

export const PublishLink = ({ className, children }) => {
  const { toggle } = useContext(Ctx);
  const timer = useRef(null);
  const longPressed = useRef(false);
  const touching = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const endTouch = useCallback(() => {
    clear();
    // contextmenu can fire slightly after touchend on some browsers
    setTimeout(() => {
      touching.current = false;
    }, 300);
  }, [clear]);

  const handleTouchStart = useCallback(() => {
    touching.current = true;
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      toggle();
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
  }, [toggle]);

  const handleTouchEnd = useCallback((e) => {
    endTouch();
    if (longPressed.current) {
      e.preventDefault();
    }
  }, [endTouch]);

  const handleClick = useCallback((e) => {
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
    }
  }, []);

  const handleContextMenu = useCallback((e) => {
    if (touching.current || longPressed.current) {
      e.preventDefault();
    }
  }, []);

  return (
    <Link
      to='/publish'
      className={classNames('simple-compose__publish-link', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={endTouch}
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

const SettingsModal = ({ autoClose, onAutoCloseChange, onClose }) => {
  const intl = useIntl();

  return (
    <div className='simple-compose__settings-modal'>
      <div className='simple-compose__settings-modal__overlay' onClick={onClose} role='presentation' />
      <div className='simple-compose__settings-modal__panel' role='dialog' aria-modal='true' aria-labelledby='simple-compose-settings-title'>
        <div className='simple-compose__settings-modal__header'>
          <h2 id='simple-compose-settings-title' className='simple-compose__settings-modal__title'>
            {intl.formatMessage(messages.settingsTitle)}
          </h2>
          <IconButton
            title={intl.formatMessage(messages.close)}
            icon='times'
            iconComponent={CloseIcon}
            onClick={onClose}
            size={20}
          />
        </div>
        <div className='simple-compose__settings-modal__body'>
          <CheckBox
            label={intl.formatMessage(messages.autoClose)}
            checked={autoClose}
            onChange={onAutoCloseChange}
          />
        </div>
      </div>
    </div>
  );
};

SettingsModal.propTypes = {
  autoClose: PropTypes.bool.isRequired,
  onAutoCloseChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const Bar = ({ onClose }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const isSubmitting = useAppSelector((s) => s.getIn(['compose', 'is_submitting']));
  const composeText = useAppSelector((s) => s.getIn(['compose', 'text']));
  const [text, setText] = useState('');
  const [autoClose, setAutoClose] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      if (e.key !== 'Escape') return;
      if (settingsOpen) {
        setSettingsOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, [onClose, settingsOpen]);

  useEffect(() => {
    if (submitted.current && !isSubmitting && !composeText) {
      submitted.current = false;
      setText('');
      if (autoClose) {
        onClose();
      }
    } else if (submitted.current && !isSubmitting) {
      submitted.current = false;
    }
  }, [isSubmitting, composeText, onClose, autoClose]);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleAutoCloseChange = useCallback(({ target }) => {
    setAutoClose(target.checked);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isSubmitting) return;
    submitted.current = true;
    dispatch(changeCompose(text));
    dispatch(submitCompose());
  }, [text, isSubmitting, dispatch]);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
  }, []);

  return (
    <>
      <div className='simple-compose'>
        <button
          type='button'
          className='simple-compose__settings'
          onClick={openSettings}
          title={intl.formatMessage(messages.settings)}
          aria-label={intl.formatMessage(messages.settings)}
        >
          <Icon id='settings' icon={SettingsIcon} />
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
      {settingsOpen && (
        <SettingsModal
          autoClose={autoClose}
          onAutoCloseChange={handleAutoCloseChange}
          onClose={closeSettings}
        />
      )}
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

  const toggleBar = useCallback(() => {
    if (layout !== 'mobile') return;
    setOpen((prev) => {
      if (prev) return false;
      dispatch(resetCompose());
      return true;
    });
  }, [layout, dispatch]);

  const closeBar = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={{ toggle: toggleBar }}>
      {children}
      {layout === 'mobile' && open && <Bar onClose={closeBar} />}
    </Ctx.Provider>
  );
};

SimpleComposeShell.propTypes = {
  children: PropTypes.node,
};
