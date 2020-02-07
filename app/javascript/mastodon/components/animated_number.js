import React from 'react';
import PropTypes from 'prop-types';
import { FormattedNumber } from 'react-intl';
import TransitionMotion from 'react-motion/lib/TransitionMotion';
import spring from 'react-motion/lib/spring';
import { reduceMotion } from 'mastodon/initial_state';

export default class AnimatedNumber extends React.PureComponent {

  static propTypes = {
    value: PropTypes.number.isRequired,
  };

  state = {
    direction: 1,
  };

  componentWillReceiveProps (nextProps) {
    if (nextProps.value > this.props.value) {
      this.setState({ direction: 1 });
    } else if (nextProps.value < this.props.value) {
      this.setState({ direction: -1 });
    }
  }

  willEnter = () => {
    const { direction } = this.state;

    return { y: -1 * direction };
  }

  willLeave = () => {
    const { direction } = this.state;

    return { y: spring(1 * direction, { damping: 35, stiffness: 400 }) };
  }

  render () {
    const { value } = this.props;
    const { direction } = this.state;

    if (reduceMotion) {
      return <FormattedNumber value={value} />;
    }

    const styles = [{
      key: `${value}`,
      data: value,
      style: { y: spring(0, { damping: 35, stiffness: 400 }) },
    }];

    return (
      <TransitionMotion styles={styles} willEnter={this.willEnter} willLeave={this.willLeave}>
        {items => (
          <span className='animated-number'>
            {items.map(({ key, data, style }) => (
              <span key={key} style={{ position: (direction * style.y) > 0 ? 'absolute' : 'static', transform: `translateY(${style.y * 100}%)` }}><FormattedNumber value={data} /></span>
            ))}
          </span>
        )}
      </TransitionMotion>
    );
  }

}