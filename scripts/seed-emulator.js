/**
 * Seed script for Firebase Emulator
 * Creates test users in Auth AND Firestore
 * 
 * Usage: node scripts/seed-emulator.js
 */

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIRESTORE_EMULATOR_URL = 'http://127.0.0.1:8080';
const PROJECT_ID = 'fantasy-football-dynasty-77cec';

const testUsers = [
  {
    email: 'krcole32@gmail.com',
    password: 'testtest',
    displayName: 'Admin User',
    localId: 'admin-user-001',
    roles: ['admin', 'user']
  },
  {
    email: 'team1@test.com',
    password: 'testtest',
    displayName: 'Team 1 Owner',
    localId: 'team-owner-001',
    roles: ['user']
  },
  {
    email: 'team2@test.com',
    password: 'testtest',
    displayName: 'Team 2 Owner',
    localId: 'team-owner-002',
    roles: ['user']
  },
  {
    email: 'team3@test.com',
    password: 'testtest',
    displayName: 'Team 3 Owner',
    localId: 'team-owner-003',
    roles: ['user']
  },
  {
    email: 'team4@test.com',
    password: 'testtest',
    displayName: 'Team 4 Owner',
    localId: 'team-owner-004',
    roles: ['user']
  },
  {
    email: 'team5@test.com',
    password: 'testtest',
    displayName: 'Team 5 Owner',
    localId: 'team-owner-005',
    roles: ['user']
  },
  {
    email: 'team6@test.com',
    password: 'testtest',
    displayName: 'Team 6 Owner',
    localId: 'team-owner-006',
    roles: ['user']
  },
  {
    email: 'team7@test.com',
    password: 'testtest',
    displayName: 'Team 7 Owner',
    localId: 'team-owner-007',
    roles: ['user']
  },
  {
    email: 'team8@test.com',
    password: 'testtest',
    displayName: 'Team 8 Owner',
    localId: 'team-owner-008',
    roles: ['user']
  },
  {
    email: 'team9@test.com',
    password: 'testtest',
    displayName: 'Team 9 Owner',
    localId: 'team-owner-009',
    roles: ['user']
  },
  {
    email: 'team10@test.com',
    password: 'testtest',
    displayName: 'Team 10 Owner',
    localId: 'team-owner-010',
    roles: ['user']
  },
  {
    email: 'team11@test.com',
    password: 'testtest',
    displayName: 'Team 11 Owner',
    localId: 'team-owner-011',
    roles: ['user']
  },
  {
    email: 'team12@test.com',
    password: 'testtest',
    displayName: 'Team 12 Owner',
    localId: 'team-owner-012',
    roles: ['user']
  }
];

async function createAuthUser(user) {
  const url = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        returnSecureToken: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Auth: Created user ${user.email}`);
      return data.localId; // Return the UID
    } else {
      const error = await response.json();
      if (error.error?.message === 'EMAIL_EXISTS') {
        console.log(`⏭️  Auth: User already exists ${user.email}`);
        // Try to get the existing user's UID by signing in
        return await getExistingUserUid(user.email, user.password);
      } else {
        console.error(`❌ Auth: Failed to create ${user.email}:`, error.error?.message || error);
        return null;
      }
    }
  } catch (err) {
    console.error(`❌ Auth: Error creating ${user.email}:`, err.message);
    return null;
  }
}

async function getExistingUserUid(email, password) {
  const url = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.localId;
    }
  } catch (err) {
    // Ignore errors
  }
  return null;
}

async function createFirestoreUser(uid, user) {
  if (!uid) {
    console.log(`⏭️  Firestore: Skipping ${user.email} (no UID)`);
    return;
  }

  // Firestore REST API for emulator
  const url = `${FIRESTORE_EMULATOR_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?documentId=${uid}`;
  
  const firestoreDoc = {
    fields: {
      email: { stringValue: user.email },
      displayName: { stringValue: user.displayName },
      roles: { 
        arrayValue: { 
          values: user.roles.map(role => ({ stringValue: role }))
        }
      },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreDoc)
    });

    if (response.ok) {
      console.log(`✅ Firestore: Created user doc for ${user.email} (roles: ${user.roles.join(', ')})`);
    } else {
      const error = await response.text();
      // Check if document already exists
      if (error.includes('ALREADY_EXISTS')) {
        console.log(`⏭️  Firestore: User doc already exists for ${user.email}`);
      } else {
        console.error(`❌ Firestore: Failed for ${user.email}:`, error);
      }
    }
  } catch (err) {
    console.error(`❌ Firestore: Error for ${user.email}:`, err.message);
  }
}

async function checkEmulatorRunning(url, name) {
  try {
    const response = await fetch(url);
    return response.ok || response.status === 200 || response.status === 400;
  } catch {
    return false;
  }
}

// Helper to convert JS object to Firestore format
function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  } else if (typeof value === 'string') {
    return { stringValue: value };
  } else if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  } else if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => toFirestoreValue(v))
      }
    };
  } else if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        )
      }
    };
  }
  return { stringValue: String(value) };
}

async function createLeague(adminUid, allUserUids) {
  const leagueId = `test-league-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Default league rules
  const defaultRules = {
    scoring: {
      ppr: 1.0,
      passingYards: 0.04,
      rushingYards: 0.1,
      receivingYards: 0.1,
      passingTouchdown: 4,
      rushingTouchdown: 6,
      receivingTouchdown: 6,
      interception: -2,
      fumble: -2,
      fieldGoal: 3,
      extraPoint: 1,
    },
    cap: {
      salaryCap: 200000000, // $200M
      minimumSpend: 180000000, // $180M
      deadMoneyRules: {
        preJune1: true,
        signingBonusAcceleration: true,
      },
    },
    contracts: {
      maxYears: 5,
      maxSigningBonus: 50000000, // $50M
      rookieScale: true,
    },
    draft: {
      mode: 'snake',
      rounds: 7,
      timeLimit: 60,
      snakeOrder: true,
      autodraftDelay: 30,
      rookieAutoContracts: true,
      veteranNegotiationWindow: 24,
    },
    freeAgency: {
      bidRounds: 300, // 5 minutes
      tieBreakers: ['guarantees', 'apy', 'length', 'random'],
    },
    roster: {
      minPlayers: 20,
      maxPlayers: 26,
      positionRequirements: {
        QB: 1,
        RB: 2,
        WR: 3,
        TE: 1,
        K: 1,
        DEF: 1,
        DL: 2,
        LB: 2,
        DB: 2,
      },
      allowIR: true,
      allowTaxi: true,
      maxIR: 3,
      maxTaxi: 5,
    },
  };

  // Create league document
  const leagueUrl = `${FIRESTORE_EMULATOR_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/leagues?documentId=${leagueId}`;
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const leagueDoc = {
    fields: {
      name: { stringValue: 'Test Dynasty League' },
      description: { stringValue: 'Seed data league for testing' },
      numberOfTeams: { integerValue: allUserUids.length },
      currentYear: { integerValue: new Date().getFullYear() },
      phase: { stringValue: 'offseason' },
      status: { stringValue: 'active' },
      isPrivate: { booleanValue: false },
      joinCode: { stringValue: joinCode },
      members: {
        arrayValue: {
          values: allUserUids.map(uid => ({ stringValue: uid }))
        }
      },
      rules: toFirestoreValue(defaultRules),
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    }
  };

  try {
    const response = await fetch(leagueUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leagueDoc)
    });

    if (response.ok) {
      console.log(`✅ Created league: ${leagueId}`);
      return leagueId;
    } else {
      const error = await response.text();
      console.error(`❌ Failed to create league:`, error);
      return null;
    }
  } catch (err) {
    console.error(`❌ Error creating league:`, err.message);
    return null;
  }
}

async function addMemberToLeague(leagueId, userId, userData, index) {
  const teamId = `team_${leagueId}_${userId}_${Date.now()}`;
  const role = index === 0 ? 'owner' : 'general-manager';
  const defaultCapSpace = 200000000;
  
  // Create member document in subcollection
  const memberUrl = `${FIRESTORE_EMULATOR_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/leagues/${leagueId}/members?documentId=${userId}`;
  const now = new Date().toISOString();
  
  const memberDoc = {
    fields: {
      userId: { stringValue: userId },
      leagueId: { stringValue: leagueId },
      role: { stringValue: role },
      teamName: { stringValue: userData.displayName || `Team ${index + 1}` },
      teamId: { stringValue: teamId },
      capSpace: { doubleValue: defaultCapSpace },
      roster: { arrayValue: { values: [] } },
      isActive: { booleanValue: true },
      joinedAt: { timestampValue: now },
      permissions: { mapValue: { fields: {} } }, // Simplified permissions
    }
  };

  try {
    const response = await fetch(memberUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberDoc)
    });

    if (response.ok) {
      console.log(`  ✅ Added ${userData.displayName} to league (${role})`);
      return teamId;
    } else {
      const error = await response.text();
      if (error.includes('ALREADY_EXISTS')) {
        console.log(`  ⏭️  Member already exists: ${userData.displayName}`);
        return teamId;
      } else {
        console.error(`  ❌ Failed to add member ${userData.displayName}:`, error);
        return null;
      }
    }
  } catch (err) {
    console.error(`  ❌ Error adding member ${userData.displayName}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🔥 Firebase Emulator Seed Script');
  console.log('================================\n');

  // Check if emulators are running
  const authRunning = await checkEmulatorRunning(AUTH_EMULATOR_URL, 'Auth');
  const firestoreRunning = await checkEmulatorRunning(FIRESTORE_EMULATOR_URL, 'Firestore');
  
  if (!authRunning) {
    console.error('❌ Auth emulator is not running at', AUTH_EMULATOR_URL);
  }
  if (!firestoreRunning) {
    console.error('❌ Firestore emulator is not running at', FIRESTORE_EMULATOR_URL);
  }
  
  if (!authRunning || !firestoreRunning) {
    console.log('\nPlease start the emulators first:');
    console.log('  firebase emulators:start');
    process.exit(1);
  }

  console.log(`📍 Auth emulator: ${AUTH_EMULATOR_URL}`);
  console.log(`📍 Firestore emulator: ${FIRESTORE_EMULATOR_URL}\n`);
  console.log(`Creating ${testUsers.length} test users...\n`);

  const userUids = [];
  
  for (const user of testUsers) {
    // Create Auth user and get UID
    const uid = await createAuthUser(user);
    
    if (uid) {
      userUids.push(uid);
      // Create Firestore user document
      await createFirestoreUser(uid, user);
    }
    
    console.log(''); // Blank line between users
  }

  console.log('\n================================');
  console.log('Creating test league...\n');

  // Create league with all users
  const adminUid = userUids[0]; // First user is admin
  const leagueId = await createLeague(adminUid, userUids);

  if (leagueId) {
    console.log(`\nAdding ${userUids.length} members to league...\n`);
    
    // Add each user as a member
    for (let i = 0; i < userUids.length; i++) {
      const uid = userUids[i];
      const userData = testUsers[i];
      await addMemberToLeague(leagueId, uid, userData, i);
    }
  }

  console.log('\n================================');
  console.log('✅ Seed complete!');
  console.log('\nYou can now log in with:');
  console.log('  Email: krcole32@gmail.com');
  console.log('  Password: testtest');
  console.log('  Role: admin');
  console.log('\nOr any of the team1-12@test.com accounts (role: user)');
  if (leagueId) {
    console.log(`\n📋 Test League ID: ${leagueId}`);
    console.log('   All users have been added to this league!');
  }
}

main().catch(console.error);
