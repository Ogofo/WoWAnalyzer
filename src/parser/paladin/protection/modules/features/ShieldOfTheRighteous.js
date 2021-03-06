import React from 'react';
import { formatPercentage, formatThousands } from 'common/format';
import SpellIcon from 'common/SpellIcon';
import SpellLink from 'common/SpellLink';
import StatisticBox, { STATISTIC_ORDER } from 'interface/others/StatisticBox';
import Analyzer from 'parser/core/Analyzer';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import SPELLS from 'common/SPELLS';
import MAGIC_SCHOOLS from 'game/MAGIC_SCHOOLS';
import { findByBossId } from 'raids/index';

const VALOR_BUFFER_TIME = 100;
const VALOR_GAIN_THRESHOLD = 2000;

const SOTR_DURATION = 4500;

const isGoodCast = (cast, endTime) => cast.melees >= 2 || cast.tankbusters >= 1 || cast.remainingCharges >= 1.35 || cast.buffEndTime > endTime || (cast.consumedValor && cast.beforeValorGained);

class ShieldOfTheRighteous extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
  };

  physicalHitsWithShieldOfTheRighteous = 0;
  physicalDamageWithShieldOfTheRighteous = 0;
  physicalHitsWithoutShieldOfTheRighteous = 0;
  physicalDamageWithoutShieldOfTheRighteous = 0;

  _tankbusters = [];

  _sotrCasts = [
    /*
    {
        castTime: <timestamp>,
        buffStartTime: <timestamp>, // if extending, when the "new" buff starts. otherwise just castTime
        buffEndTime: <timestamp>, // end time of the buff. if the current buff is > 2x SOTR_DURATION then this can be < SOTR_DURATION
        melees: <number>, // melees received while during buff
        tankbusters: <number>, // tankbusters mitigated by buff
        remainingCharges: <number>, // fractional number of charges remaining *after* cast
        consumedValor: <boolean>, // whether the player had Avenger's Valor when cast
        beforeValorGained: <boolean>, // whether the player gained Avenger's Valor immediately after casting
     }
     */
  ];

  // this setup is used to track which melee attacks are mitigated by
  // which casts.
  _futureCasts = [];
  _activeCast = null;

  _buffExpiration = 0;

  get _latestCast() {
    if (this._futureCasts.length > 0) {
      return this._futureCasts[this._futureCasts.length - 1];
    }

    return this._activeCast;
  }

  constructor(...args) {
    super(...args);
    // M+ doesn't have a boss prop
    if (this.owner.boss) {
      const boss = findByBossId(this.owner.boss.id);
      this._tankbusters = (boss.fight.softMitigationChecks && boss.fight.softMitigationChecks.physical) || [];
    }
  }

  _partialCharge() {
    const cd = this.spellUsable._currentCooldowns[SPELLS.SHIELD_OF_THE_RIGHTEOUS.id];

    return 1 - this.spellUsable.cooldownRemaining(SPELLS.SHIELD_OF_THE_RIGHTEOUS.id) / cd.expectedDuration;
  }

  on_byPlayer_cast(event) {
    if (event.ability.guid !== SPELLS.SHIELD_OF_THE_RIGHTEOUS.id) {
      return;
    }

    const buffEndTime = Math.min(
      // if the buff expired before the current event, its just
      // event.timestamp + SOTR_DURATION ...
      Math.max(this._buffExpiration, event.timestamp) + SOTR_DURATION,
      // ... otherwise limit it to no more than 3x SOTR_DURATION from
      // now due to buff duration caps
      event.timestamp + SOTR_DURATION * 3,
    );

    const cast = {
      castTime: event.timestamp,
      buffStartTime: Math.max(this._buffExpiration, event.timestamp),
      buffEndTime: buffEndTime,
      melees: 0,
      tankbusters: 0,
      remainingCharges: this.spellUsable.chargesAvailable(SPELLS.SHIELD_OF_THE_RIGHTEOUS.id) + this._partialCharge(),
      consumedValor: this.selectedCombatant.hasBuff(SPELLS.AVENGERS_VALOR_BUFF.id, null, VALOR_BUFFER_TIME),
      beforeValorGained: false,
      _event: event,
    };

    this._buffExpiration = buffEndTime;

    this._updateActiveCast(event);
    if (cast.buffStartTime > cast.castTime) {
      this._futureCasts.push(cast);
    } else {
      this._activeCast = cast;
    }
    this._sotrCasts.push(cast);
  }

  on_toPlayer_applybuff(event) {
    if (event.ability.guid !== SPELLS.AVENGERS_VALOR_BUFF.id) {
      return;
    }

    if (this._latestCast && this._latestCast.castTime > event.timestamp - VALOR_GAIN_THRESHOLD) {
      this._latestCast.beforeValorGained = true;
    }
  }

  on_toPlayer_damage(event) {
    if (event.ability.type !== MAGIC_SCHOOLS.ids.PHYSICAL) {
      return;
    }

    if (this.selectedCombatant.hasBuff(SPELLS.SHIELD_OF_THE_RIGHTEOUS_BUFF.id)) {
      this.physicalHitsWithShieldOfTheRighteous += 1;
      this.physicalDamageWithShieldOfTheRighteous += event.amount + (event.absorbed || 0) + (event.overkill || 0);

      if (this._tankbusters.includes(event.ability.guid)) {
        this._processTankbuster(event);
      } else {
        this._processPhysicalHit(event);
      }
    } else {
      this.physicalHitsWithoutShieldOfTheRighteous += 1;
      this.physicalDamageWithoutShieldOfTheRighteous += event.amount + (event.absorbed || 0) + (event.overkill || 0);
    }
  }

  on_fightend(event) {
    if (this._activeCast) {
      this._markupCast(this._activeCast);
    }
    this._futureCasts.forEach(this._markupCast.bind(this));
  }

  _processPhysicalHit(event) {
    this._updateActiveCast(event);
    if (!this._activeCast) {
      return;
    }

    this._activeCast.melees += 1;
  }

  _processTankbuster(event) {
    this._updateActiveCast(event);
    if (!this._activeCast) {
      return;
    }

    this._activeCast.tankbusters += 1;
  }

  // if the buff associated with the current active cast is no longer
  // active, move to the next.
  _updateActiveCast(event) {
    while (this._activeCast && this._activeCast.buffEndTime < event.timestamp) {
      this._markupCast(this._activeCast);
      this._activeCast = this._futureCasts.shift();
    }
  }

  _markupCast(cast) {
    if (isGoodCast(cast, this.owner.fight.end_time)) {
      return;
    }
    const meta = cast._event.meta || {};
    meta.isInefficientCast = true;
    meta.inefficientCastReason = 'This cast did not block many melee attacks, or block a tankbuster, or prevent you from capping SotR charges, or avoid wasting Avenger\'s Valor.';
    cast._event.meta = meta;
  }

  get goodCasts() {
    return this._sotrCasts.filter(cast => isGoodCast(cast, this.owner.fight.end_time));
  }

  get suggestionThresholds() {
    return {
      actual: this.goodCasts.length / this._sotrCasts.length,
      isLessThan: {
        minor: 0.9,
        average: 0.75,
        major: 0.6,
      },
      style: 'percentage',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds)
      .addSuggestion((suggest, actual, recommended) => suggest(<>{formatPercentage(actual)}% of your <SpellLink id={SPELLS.SHIELD_OF_THE_RIGHTEOUS.id} /> casts were <em>good</em> (they mitigated at least 2 auto-attacks or 1 tankbuster, or prevented capping charges). You should have Shield of the Righteous up to mitigate as much physical damage as possible.</>)
          .icon(SPELLS.SHIELD_OF_THE_RIGHTEOUS.icon)
          .actual(`${formatPercentage(actual)}% good Shield of the Righteous casts`)
          .recommended(`${Math.round(formatPercentage(recommended))}% or more is recommended`));
  }

  statistic() {
    const physicalHitsMitigatedPercent = this.physicalHitsWithShieldOfTheRighteous / (this.physicalHitsWithShieldOfTheRighteous + this.physicalHitsWithoutShieldOfTheRighteous);
    const physicalDamageMitigatedPercent = this.physicalDamageWithShieldOfTheRighteous / (this.physicalDamageWithShieldOfTheRighteous + this.physicalDamageWithoutShieldOfTheRighteous);

    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.SHIELD_OF_THE_RIGHTEOUS.id} />}
        value={`${formatPercentage(physicalDamageMitigatedPercent)}%`}
        label="Physical damage mitigated"
        tooltip={(
          <>
            Shield of the Righteous usage breakdown:
            <ul>
              <li>You were hit <strong>{this.physicalHitsWithShieldOfTheRighteous}</strong> times with your Shield of the Righteous buff (<strong>{formatThousands(this.physicalDamageWithShieldOfTheRighteous)}</strong> damage).</li>
              <li>You were hit <strong>{this.physicalHitsWithoutShieldOfTheRighteous}</strong> times <strong><em>without</em></strong> your Shield of the Righteous buff (<strong>{formatThousands(this.physicalDamageWithoutShieldOfTheRighteous)}</strong> damage).</li>
            </ul>
            <strong>{formatPercentage(physicalHitsMitigatedPercent)}%</strong> of physical attacks were mitigated with Shield of the Righteous (<strong>{formatPercentage(physicalDamageMitigatedPercent)}%</strong> of physical damage taken).<br />
            <strong>{this.goodCasts.length}</strong> of your {this._sotrCasts.length} casts were <em>good</em> (blocked at least 2 melees or a tankbuster, or prevented capping charges, or consumed an Avenger's Valor buff that was about to be overwritten).
          </>
        )}
      />
    );
  }
  statisticOrder = STATISTIC_ORDER.CORE(10);
}

export default ShieldOfTheRighteous;
