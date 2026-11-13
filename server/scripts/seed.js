/**
 * TOIGO Database Seeder
 * Safe development/test database seeder.
 * Run with: npm run seed
 */
const { db } = require('../config/db');

console.log('🌱 Seeding TOIGO Development Database...');
const freshData = db.reset();
console.log(`✅ Successfully seeded database with:`);
console.log(`   - ${freshData.users.length} Users (Citizen, Hosts, Admin)`);
console.log(`   - ${freshData.toilets.length} Verified Facilities`);
console.log(`   - ${freshData.reports.length} Reports`);
console.log(`   - ${freshData.reviews.length} Hygiene Reviews`);
console.log(`   - ${freshData.payments.length} Payments`);
console.log('🎉 Database is ready for development & testing!\n');
