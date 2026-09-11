// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_spicy_madame_masque.sql';
import m0001 from './0001_freezing_rhino.sql';
import m0002 from './0002_oval_doorman.sql';
import m0003 from './0003_majestic_war_machine.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003
    }
  }
  