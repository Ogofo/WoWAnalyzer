import SPELLS from 'common/SPELLS';
import CoreAbilities from 'parser/core/modules/Abilities';

class Abilities extends CoreAbilities {
  spellbook() {
    const combatant = this.selectedCombatant;
    const brewCooldown = 15 - (combatant.hasTalent(SPELLS.LIGHT_BREWING_TALENT.id) ? 3 : 0);
    return [
      // Rotational Spells
      {
        spell: SPELLS.KEG_SMASH,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        cooldown: haste => 8 / (1 + haste),
        charges: 1,
        castEfficiency: {
          suggestion: true,
        },
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.BLACKOUT_KICK_BRM,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        cooldown: 4,
        castEfficiency: {
          suggestion: true,
        },
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.BREATH_OF_FIRE,
        isDefensive: true,
        buffSpellId: SPELLS.BREATH_OF_FIRE_DEBUFF.id,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        cooldown: 15,
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.TIGER_PALM,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.RUSHING_JADE_WIND_TALENT_BREWMASTER,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        cooldown: haste => 6 / (1 + haste),
        enabled: combatant.hasTalent(SPELLS.RUSHING_JADE_WIND_TALENT_BREWMASTER.id),
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.CRACKLING_JADE_LIGHTNING,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL,
        gcd: {
          // This was tested in-game (in Legion): it does NOT have a static GCD but a base GCD of 1sec and scales with Haste
          base: 1500,
        },
      },
      {
        spell: SPELLS.SPINNING_CRANE_KICK_BRM,
        category: Abilities.SPELL_CATEGORIES.ROTATIONAL_AOE,
        gcd: {
          static: 1000,
        },
      },
      // Cooldowns
      {
        spell: SPELLS.INVOKE_NIUZAO_THE_BLACK_OX,
        category: Abilities.SPELL_CATEGORIES.COOLDOWNS,
        cooldown: 180,
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.PURIFYING_BREW,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: haste => brewCooldown / (1 + haste),
        charges: combatant.hasTalent(SPELLS.LIGHT_BREWING_TALENT.id) ? 4 : 3,
        gcd: null,
        castEfficiency: {
          suggestion: true,
          recommendedEfficiency: 0.95,
        },
      },
      {
        spell: SPELLS.CELESTIAL_BREW,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: haste => 2 * brewCooldown / (1 + haste),
        gcd: {
          static: 1000,
        },
        castEfficiency: {
          suggestion: true,
          recommendedEfficiency: 0.9,
        },
      },
      {
        spell: SPELLS.BLACK_OX_BREW_TALENT,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: 120,
        castEfficiency: {
          suggestion: false,
          recommendedEfficiency: 0.7,
        },
        enabled: combatant.hasTalent(SPELLS.BLACK_OX_BREW_TALENT.id),
        gcd: null,
      },
      {
        spell: SPELLS.EXPEL_HARM,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        gcd: {
          static: 500,
        },
      },
      {
        spell: SPELLS.FORTIFYING_BREW_BRM,
        buffSpellId: SPELLS.FORTIFYING_BREW_BRM_BUFF.id,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: 420,
        gcd: null,
      },
      {
        spell: SPELLS.HEALING_ELIXIR_TALENT,
        category: Abilities.SPELL_CATEGORIES.COOLDOWNS,
        cooldown: 30,
        enabled: combatant.hasTalent(SPELLS.HEALING_ELIXIR_TALENT.id),
        gcd: null,
      },
      {
        spell: SPELLS.DAMPEN_HARM_TALENT,
        buffSpellId: SPELLS.DAMPEN_HARM_TALENT.id,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: 120,
        enabled: combatant.hasTalent(SPELLS.DAMPEN_HARM_TALENT.id),
        gcd: null,
      },
      {
        spell: SPELLS.ZEN_MEDITATION,
        buffSpellId: SPELLS.ZEN_MEDITATION.id,
        category: Abilities.SPELL_CATEGORIES.DEFENSIVE,
        cooldown: 300,
        gcd: null,
      },
      // Utility
      {
        spell: SPELLS.RING_OF_PEACE_TALENT,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        enabled: combatant.hasTalent(SPELLS.RING_OF_PEACE_TALENT.id),
        gcd: {
          // This was tested in-game (in Legion): it does NOT have a static GCD but a base GCD of 1sec and scales with Haste
          base: 1500,
        },
      },
      {
        spell: SPELLS.CHI_TORPEDO_TALENT,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        enabled: combatant.hasTalent(SPELLS.CHI_TORPEDO_TALENT.id),
        // Both Roll and Chi Torpedo don't actually have a GCD but block all spells during its animation for about the same duration, so maybe time it in-game and mark it as channeling instead? The issue is you can follow up any ability on the GCD with chi torpedo/roll, so it can still cause overlap.
        gcd: null,
      },
      {
        spell: SPELLS.ROLL,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        enabled: !combatant.hasTalent(SPELLS.CHI_TORPEDO_TALENT.id),
        // Both Roll and Chi Torpedo don't actually have a GCD but block all spells during its animation for about the same duration, so maybe time it in-game and mark it as channeling instead? The issue is you can follow up any ability on the GCD with chi torpedo/roll, so it can still cause overlap.
        gcd: null,
      },
      {
        spell: SPELLS.TRANSCENDENCE,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.TRANSCENDENCE_TRANSFER,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: {
          // This was tested in-game (in Legion): it does NOT have a static GCD but a base GCD of 1sec and scales with Haste
          base: 1500,
        },
      },
      {
        spell: SPELLS.SUMMON_BLACK_OX_STATUE_TALENT,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        enabled: combatant.hasTalent(SPELLS.SUMMON_BLACK_OX_STATUE_TALENT.id),
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.PARALYSIS,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: {
          static: 1000,
        },
      },
      {
        spell: SPELLS.PROVOKE,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: null,
      },
      {
        spell: SPELLS.SPEAR_HAND_STRIKE,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: null,
      },
      // Its unlikely that these spells will ever be cast but if they are they will show.
      {
        spell: SPELLS.DETOX_ENERGY,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: {
          // This was tested in-game (in Legion): it does NOT have a static GCD but a base GCD of 1sec and scales with Haste
          base: 1500,
        },
      },
      {
        spell: SPELLS.VIVIFY, // don't know if the vivify spell has been updated to the new ID yet
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        gcd: {
          base: 1500,
        },
      },
      {
        spell: SPELLS.TIGERS_LUST_TALENT,
        category: Abilities.SPELL_CATEGORIES.UTILITY,
        enabled: combatant.hasTalent(SPELLS.TIGERS_LUST_TALENT.id),
        gcd: {
          static: 1000,
        },
      },
    ];
  }
}

export default Abilities;
