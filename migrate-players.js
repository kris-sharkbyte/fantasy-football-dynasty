const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (you'll need to set GOOGLE_APPLICATION_CREDENTIALS)
// admin.initializeApp();

async function migratePlayers() {
  try {
    // Read the players JSON file
    const playersData = JSON.parse(
      fs.readFileSync('./players-nfl.json', 'utf8')
    );

    console.log(`Found ${playersData.length} players to migrate`);

    // Get Firestore reference
    const db = admin.firestore();
    const batch = db.batch();

    // Process each player
    playersData.forEach((player, index) => {
      const playerRef = db
        .collection('players')
        .doc(player.id || `player_${index}`);

      // Add metadata for easier querying
      const playerDoc = {
        ...player,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        isDrafted: false,
        leagueId: null, // Will be set when drafted
        teamId: null, // Will be set when drafted
      };

      batch.set(playerRef, playerDoc);
    });

    // Commit the batch
    await batch.commit();
    console.log('Successfully migrated all players to Firestore!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePlayers();
}

module.exports = { migratePlayers };
