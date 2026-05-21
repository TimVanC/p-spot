/**
 * Seed script — populates the database with realistic dummy data.
 * Usage: npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in app/.env
 * Get it from: Supabase Dashboard → Project Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'your_service_role_key_here') {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env first.');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

const DUMMY_USERS = [
  { username: 'TrailMike_CO',       display_name: 'Trail Mike',      level: 8,  xp: 3200,  email: 'trailmike_co@pspot.dev' },
  { username: 'AlpineReleaser',     display_name: 'Alpine Releaser', level: 12, xp: 6800,  email: 'alpinereleaser@pspot.dev' },
  { username: 'PNWBushman',         display_name: 'PNW Bushman',     level: 5,  xp: 1900,  email: 'pnwbushman@pspot.dev' },
  { username: 'GrandCanyonGuy',     display_name: 'Grand Canyon Guy',level: 15, xp: 9400,  email: 'grandcanyonguy@pspot.dev' },
  { username: 'CoastalPeaker_Dan',  display_name: 'Dan Coastal',     level: 6,  xp: 2300,  email: 'coastalpeaker@pspot.dev' },
];

const SPOT_TEMPLATES = [
  {
    location_name: 'Rocky Mountain National Park, CO', lat: 40.3428, lng: -105.6836,
    altitude_ft: 11796, score_total: 88, score_view: 22, score_elevation: 18,
    score_remoteness: 13, score_lighting: 9, bonus_skyline: 6, bonus_sunrise: 0,
    bonus_wildlife: 0, bonus_girth: 4, bonus_hydration: 4, bonus_danger: 7,
    score_tier: 'Elite Peak Releaser',
    ai_quote: 'Continental Divide views don\'t get better than this throne.',
    pee_detected: true, wildlife_detected: false, privacy: 'public',
  },
  {
    location_name: 'Grand Teton NP, WY', lat: 43.7904, lng: -110.6818,
    altitude_ft: 13770, score_total: 94, score_view: 24, score_elevation: 20,
    score_remoteness: 14, score_lighting: 10, bonus_skyline: 7, bonus_sunrise: 5,
    bonus_wildlife: 8, bonus_girth: 3, bonus_hydration: 3, bonus_danger: 6,
    score_tier: 'Cascade Commander',
    ai_quote: 'The Tetons photobombed your stream. Respect.',
    pee_detected: true, wildlife_detected: true, privacy: 'public',
  },
  {
    location_name: 'Zion Narrows, UT', lat: 37.2982, lng: -112.9479,
    altitude_ft: 4400, score_total: 76, score_view: 20, score_elevation: 12,
    score_remoteness: 11, score_lighting: 8, bonus_skyline: 5, bonus_sunrise: 0,
    bonus_wildlife: 0, bonus_girth: 5, bonus_hydration: 5, bonus_danger: 5,
    score_tier: 'Peak Performer',
    ai_quote: 'Slot canyon acoustics make everything sound more dramatic.',
    pee_detected: true, wildlife_detected: false, privacy: 'public',
  },
  {
    location_name: 'Glacier National Park, MT', lat: 48.6961, lng: -113.7183,
    altitude_ft: 9080, score_total: 91, score_view: 23, score_elevation: 19,
    score_remoteness: 14, score_lighting: 9, bonus_skyline: 6, bonus_sunrise: 5,
    bonus_wildlife: 5, bonus_girth: 4, bonus_hydration: 4, bonus_danger: 6,
    score_tier: 'Cascade Commander',
    ai_quote: 'Going-to-the-Sun Road had nothing on this going-to-the-drain road.',
    pee_detected: true, wildlife_detected: true, privacy: 'public',
  },
  {
    location_name: 'Mount Whitney Summit, CA', lat: 36.5786, lng: -118.2923,
    altitude_ft: 14505, score_total: 97, score_view: 25, score_elevation: 20,
    score_remoteness: 15, score_lighting: 10, bonus_skyline: 8, bonus_sunrise: 5,
    bonus_wildlife: 4, bonus_girth: 3, bonus_hydration: 2, bonus_danger: 8,
    score_tier: 'Cascade Commander',
    ai_quote: 'Highest pee in the contiguous US. You\'ve peaked.',
    pee_detected: true, wildlife_detected: false, privacy: 'public',
  },
  {
    location_name: 'Olympic National Park, WA', lat: 47.8021, lng: -123.6044,
    altitude_ft: 6001, score_total: 72, score_view: 18, score_elevation: 14,
    score_remoteness: 12, score_lighting: 7, bonus_skyline: 4, bonus_sunrise: 0,
    bonus_wildlife: 0, bonus_girth: 5, bonus_hydration: 5, bonus_danger: 4,
    score_tier: 'Peak Performer',
    ai_quote: 'Pacific Northwest mist adds a certain mystique to the whole affair.',
    pee_detected: true, wildlife_detected: false, privacy: 'streamers',
  },
  {
    location_name: 'Grand Canyon South Rim, AZ', lat: 36.0544, lng: -112.1401,
    altitude_ft: 7000, score_total: 85, score_view: 24, score_elevation: 15,
    score_remoteness: 12, score_lighting: 10, bonus_skyline: 7, bonus_sunrise: 5,
    bonus_wildlife: 0, bonus_girth: 3, bonus_hydration: 2, bonus_danger: 7,
    score_tier: 'Elite Peak Releaser',
    ai_quote: 'One mile down, 277 miles wide. Your arc had an audience.',
    pee_detected: true, wildlife_detected: false, privacy: 'public',
  },
  {
    location_name: 'Bryce Canyon, UT', lat: 37.5930, lng: -112.1871,
    altitude_ft: 8296, score_total: 79, score_view: 21, score_elevation: 16,
    score_remoteness: 11, score_lighting: 8, bonus_skyline: 5, bonus_sunrise: 0,
    bonus_wildlife: 4, bonus_girth: 4, bonus_hydration: 3, bonus_danger: 4,
    score_tier: 'Peak Performer',
    ai_quote: 'Hoodoos make excellent silent witnesses.',
    pee_detected: false, wildlife_detected: true, privacy: 'public',
  },
  {
    location_name: 'Denali National Park, AK', lat: 63.0695, lng: -151.0074,
    altitude_ft: 12000, score_total: 96, score_view: 25, score_elevation: 20,
    score_remoteness: 15, score_lighting: 9, bonus_skyline: 7, bonus_sunrise: 5,
    bonus_wildlife: 8, bonus_girth: 2, bonus_hydration: 2, bonus_danger: 8,
    score_tier: 'Cascade Commander',
    ai_quote: 'Alaska doesn\'t care about your modesty. Neither does the grizzly.',
    pee_detected: true, wildlife_detected: true, privacy: 'public',
  },
  {
    location_name: 'Yosemite Valley, CA', lat: 37.7456, lng: -119.5936,
    altitude_ft: 7214, score_total: 83, score_view: 22, score_elevation: 17,
    score_remoteness: 11, score_lighting: 9, bonus_skyline: 6, bonus_sunrise: 0,
    bonus_wildlife: 0, bonus_girth: 4, bonus_hydration: 5, bonus_danger: 4,
    score_tier: 'Elite Peak Releaser',
    ai_quote: 'Half Dome has seen a million photos. None quite like yours.',
    pee_detected: true, wildlife_detected: false, privacy: 'public',
  },
];

function makeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function seed() {
  console.log('🌱 Starting seed...\n');

  // 1. Create auth users
  const createdUserIds: string[] = [];
  for (const u of DUMMY_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: 'TestPass123!',
      email_confirm: true,
    });
    if (error) {
      if (error.message.includes('already been registered')) {
        // User exists — fetch their ID
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users.find((usr) => usr.email === u.email);
        if (existing) {
          createdUserIds.push(existing.id);
          console.log(`  ↩ User already exists: ${u.username} (${existing.id})`);
        }
      } else {
        console.error(`  ✗ Failed to create user ${u.username}:`, error.message);
        process.exit(1);
      }
    } else {
      createdUserIds.push(data.user.id);
      console.log(`  ✓ Created auth user: ${u.username} (${data.user.id})`);
    }
  }

  // 2. Upsert profiles
  for (let i = 0; i < DUMMY_USERS.length; i++) {
    const u = DUMMY_USERS[i];
    const id = createdUserIds[i];
    const { error } = await admin.from('profiles').upsert({
      id,
      username: u.username,
      display_name: u.display_name,
      level: u.level,
      xp: u.xp,
      strikes: 0,
      is_banned: false,
    });
    if (error) console.error(`  ✗ Profile ${u.username}:`, error.message);
    else console.log(`  ✓ Profile upserted: ${u.username}`);
  }

  // 3. Insert spots (2 per user, cycling through templates)
  const insertedSpotIds: string[] = [];
  let templateIdx = 0;
  for (let i = 0; i < createdUserIds.length; i++) {
    const userId = createdUserIds[i];
    const spotsForUser = 2 + (i % 2); // 2 or 3 spots per user
    for (let j = 0; j < spotsForUser; j++) {
      const t = SPOT_TEMPLATES[templateIdx % SPOT_TEMPLATES.length];
      templateIdx++;
      const shareToken = makeUUID();
      const { data, error } = await admin.from('spots').insert({
        user_id: userId,
        image_url: PLACEHOLDER_IMAGE,
        share_token: shareToken,
        privacy: t.privacy,
        lat: t.lat,
        lng: t.lng,
        altitude_ft: t.altitude_ft,
        location_name: t.location_name,
        score_total: t.score_total,
        score_view: t.score_view,
        score_elevation: t.score_elevation,
        score_remoteness: t.score_remoteness,
        score_lighting: t.score_lighting,
        score_tier: t.score_tier,
        bonus_skyline: t.bonus_skyline,
        bonus_sunrise: t.bonus_sunrise,
        bonus_wildlife: t.bonus_wildlife,
        bonus_girth: t.bonus_girth,
        bonus_hydration: t.bonus_hydration,
        bonus_danger: t.bonus_danger,
        bonus_toilet: 0,
        bonus_effort: 0,
        ai_quote: t.ai_quote,
        wildlife_detected: t.wildlife_detected,
        pee_detected: t.pee_detected,
        moderation_pass: true,
        shake_count: Math.floor(Math.random() * 20),
        drip_count: Math.floor(Math.random() * 5),
        submitted_at: daysAgo(Math.floor(Math.random() * 30)),
      }).select('id').single();

      if (error) console.error(`  ✗ Spot for ${DUMMY_USERS[i].username}:`, error.message);
      else {
        insertedSpotIds.push(data!.id);
        console.log(`  ✓ Spot: ${t.location_name} → ${DUMMY_USERS[i].username}`);
      }
    }
  }

  // 4. Get the real user's ID (first non-dummy user in profiles, or skip if unknown)
  console.log('\n⚠ To add follower relationships, paste your real user ID when prompted.');
  console.log('  (Find it in Supabase → Authentication → Users)');
  console.log('  Skipping auto-follow — run manually or re-run with REAL_USER_ID= set.\n');

  const realUserId = process.env.REAL_USER_ID;
  if (realUserId) {
    for (const followingId of createdUserIds) {
      const { error } = await admin.from('followers').upsert({
        follower_id: realUserId,
        following_id: followingId,
      });
      if (!error) console.log(`  ✓ Follow: you → ${followingId}`);
    }
  }

  // 5. Insert some drips on first few spots
  if (insertedSpotIds.length >= 2) {
    const drips = [
      { spot_id: insertedSpotIds[0], user_id: createdUserIds[1], body: 'Absolute banger of a view. Respect.' },
      { spot_id: insertedSpotIds[0], user_id: createdUserIds[2], body: 'Been there. Your stream had better elevation than mine.' },
      { spot_id: insertedSpotIds[1], user_id: createdUserIds[0], body: 'Those peaks though. Legendary.' },
      { spot_id: insertedSpotIds[2], user_id: createdUserIds[3], body: 'This is the content I signed up for.' },
    ];
    for (const d of drips) {
      await admin.from('drips').insert(d);
    }
    console.log(`  ✓ Seeded ${drips.length} drips`);
  }

  console.log('\n✅ Seed complete!');
  console.log('   To follow dummy users, re-run with:');
  console.log('   REAL_USER_ID=your-uuid npm run seed');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
