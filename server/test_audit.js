const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const path = require("path");

// Ensure environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_123456789";
process.env.ADMIN_EMAIL = "admin@test.com";
let app;
let User;
let Playlist;
let Video;
let Note;

let mongod;
let userToken;
let adminToken;
let testUser;
let testAdmin;

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests.push({ testName, details });
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

async function runAudit() {
  console.log("\n🚀 ===============================================");
  console.log("   STUDYBUDDY BACKEND COMPREHENSIVE QA AUDIT");
  console.log("===============================================\n");

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
    console.log("✅ In-Memory MongoDB connected successfully at:", uri);

    app = require("./server");
    User = require("./models/User");
    Playlist = require("./models/Playlist");
    Video = require("./models/Video");
    Note = require("./models/Note");

    // Seed test users
    testUser = await User.create({
      username: "testuser",
      email: "testuser@test.com",
      role: "user",
      avatar: "https://example.com/avatar.png",
    });
    userToken = jwt.sign({ id: testUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

    testAdmin = await User.create({
      username: "adminuser",
      email: "admin@test.com",
      role: "admin",
      avatar: "https://example.com/admin.png",
    });
    adminToken = jwt.sign({ id: testAdmin._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

    console.log("✅ Test users seeded (Standard User & Admin User)\n");

    // ==========================================
    // 1. HEALTH & UNPROTECTED ENDPOINTS
    // ==========================================
    console.log("--- 1. Testing Health & Unprotected Endpoints ---");
    {
      const res1 = await request(app).get("/api/health");
      assert(res1.status === 200 && res1.body.success === true, "GET /api/health returns 200 and success: true");

      const res2 = await request(app).get("/");
      assert(res2.status === 200 && res2.body.success === true, "GET / returns 200");

      const res3 = await request(app).get("/api");
      assert(res3.status === 200 && res3.body.success === true, "GET /api returns 200");

      const res4 = await request(app).get("/api/non-existent-route-xyz");
      assert(res4.status === 404 && res4.body.success === false, "GET invalid route returns 404 with success: false");
    }

    // ==========================================
    // 2. AUTH ENDPOINTS
    // ==========================================
    console.log("\n--- 2. Testing Auth Endpoints ---");
    {
      // Email auth validation
      const resEmpty = await request(app).post("/api/auth/email").send({});
      assert(resEmpty.status === 400 && resEmpty.body.success === false, "POST /api/auth/email empty body returns 400");

      const resInvalidEmail = await request(app).post("/api/auth/email").send({ email: "invalid-email" });
      assert(resInvalidEmail.status === 400 && resInvalidEmail.body.success === false, "POST /api/auth/email invalid email returns 400");

      const resValidEmail = await request(app).post("/api/auth/email").send({ email: "newdev@studybuddy.test", name: "New Dev" });
      assert(resValidEmail.status === 200 && resValidEmail.body.success === true && resValidEmail.body.token, "POST /api/auth/email creates/authenticates user and returns JWT token");

      // Google auth validation
      const resGoogleEmpty = await request(app).post("/api/auth/google").send({});
      assert(resGoogleEmpty.status === 400 && resGoogleEmpty.body.success === false, "POST /api/auth/google missing credential returns 400");

      const resGoogleInvalid = await request(app).post("/api/auth/google").send({ credential: "invalid.token.here" });
      assert(resGoogleInvalid.status === 400 && resGoogleInvalid.body.success === false, "POST /api/auth/google invalid token returns 400");

      // Auth middleware checks on /api/auth/me
      const resMeNoAuth = await request(app).get("/api/auth/me");
      assert(resMeNoAuth.status === 401 && resMeNoAuth.body.success === false, "GET /api/auth/me without token returns 401");

      const resMeMalformed = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid-jwt");
      assert(resMeMalformed.status === 401 && resMeMalformed.body.success === false, "GET /api/auth/me with invalid token returns 401");

      const expiredToken = jwt.sign({ id: testUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: "-1s" });
      const resMeExpired = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expiredToken}`);
      assert(resMeExpired.status === 401 && resMeExpired.body.success === false, "GET /api/auth/me with expired token returns 401");

      const resMeValid = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${userToken}`);
      assert(resMeValid.status === 200 && resMeValid.body.success === true && resMeValid.body.user.email === "testuser@test.com", "GET /api/auth/me with valid token returns 200 and user object");

      // Logout
      const resLogout = await request(app).post("/api/auth/logout");
      assert(resLogout.status === 200 && resLogout.body.success === true, "POST /api/auth/logout returns 200");
    }

    // ==========================================
    // 3. SETTINGS & PROFILE ENDPOINTS
    // ==========================================
    console.log("\n--- 3. Testing Settings & Profile Endpoints ---");
    {
      const resNoAuth = await request(app).get("/api/settings/profile");
      assert(resNoAuth.status === 401, "GET /api/settings/profile requires auth (401)");

      const resProfile = await request(app).get("/api/settings/profile").set("Authorization", `Bearer ${userToken}`);
      assert(resProfile.status === 200 && resProfile.body.success === true && resProfile.body.user.username === "testuser", "GET /api/settings/profile returns user profile");

      // Edge cases on update
      const resBadUpdate1 = await request(app).put("/api/settings/profile").set("Authorization", `Bearer ${userToken}`).send({});
      assert(resBadUpdate1.status === 400, "PUT /api/settings/profile empty body returns 400");

      const resBadUpdate2 = await request(app).put("/api/settings/profile").set("Authorization", `Bearer ${userToken}`).send({ username: "a", email: "notanemail" });
      assert(resBadUpdate2.status === 400, "PUT /api/settings/profile invalid email returns 400");

      const resBadUpdateTypes = await request(app).put("/api/settings/profile").set("Authorization", `Bearer ${userToken}`).send({
        username: "testuser",
        email: "testuser@test.com",
        badge: 12345, // wrong type (number instead of string)
        leetcodeHandle: null,
      });
      assert(resBadUpdateTypes.status === 200 && resBadUpdateTypes.body.success === true, "PUT /api/settings/profile handles non-string types safely without crash");

      const resGoodUpdate = await request(app).put("/api/settings/profile").set("Authorization", `Bearer ${userToken}`).send({
        username: "testuser_updated",
        email: "testuser@test.com",
        badge: "Pro Solver",
        leetcodeHandle: "test_lc",
        codeforcesHandle: "test_cf",
      });
      assert(resGoodUpdate.status === 200 && resGoodUpdate.body.user.username === "testuser_updated", "PUT /api/settings/profile successfully updates profile");
    }

    // ==========================================
    // 4. DASHBOARD & STREAK ENDPOINTS
    // ==========================================
    console.log("\n--- 4. Testing Dashboard & Streak Endpoints ---");
    {
      const resDash = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${userToken}`);
      assert(resDash.status === 200 && resDash.body.success === true && resDash.body.stats !== undefined, "GET /api/dashboard returns stats and empty playlists");

      const resContinue = await request(app).get("/api/dashboard/continue").set("Authorization", `Bearer ${userToken}`);
      assert(resContinue.status === 200 && resContinue.body.success === true && resContinue.body.playlist === null, "GET /api/dashboard/continue handles empty user playlists gracefully");

      const resStreak = await request(app).get("/api/streak").set("Authorization", `Bearer ${userToken}`);
      assert(resStreak.status === 200 && resStreak.body.success === true && typeof resStreak.body.currentStreak === "number", "GET /api/streak returns streak and heatmap metadata");
    }

    // ==========================================
    // 5. PLAYLISTS & VIDEOS ENDPOINTS
    // ==========================================
    console.log("\n--- 5. Testing Playlists & Video Endpoints ---");
    {
      const resList = await request(app).get("/api/playlists").set("Authorization", `Bearer ${userToken}`);
      assert(resList.status === 200 && Array.isArray(resList.body.playlists), "GET /api/playlists returns array");

      // Sync validations
      const resSyncEmpty = await request(app).post("/api/playlists/sync").set("Authorization", `Bearer ${userToken}`).send({});
      assert(resSyncEmpty.status === 400, "POST /api/playlists/sync without URL returns 400");

      const resSyncShorts = await request(app).post("/api/playlists/sync").set("Authorization", `Bearer ${userToken}`).send({
        playlistUrl: "https://www.youtube.com/shorts/abc123xyz",
      });
      assert(resSyncShorts.status === 400 && resSyncShorts.body.message.includes("Shorts"), "POST /api/playlists/sync rejects YouTube Shorts with 400");

      // Edge case: Bad/Non-existent ID
      const fakeObjectId = new mongoose.Types.ObjectId().toString();
      const resBadId = await request(app).get("/api/playlists/not-a-valid-id").set("Authorization", `Bearer ${userToken}`);
      assert(resBadId.status === 404, "GET /api/playlists/invalid-id returns 404 (handled CastError)");

      const resNonExistent = await request(app).get(`/api/playlists/${fakeObjectId}`).set("Authorization", `Bearer ${userToken}`);
      assert(resNonExistent.status === 404, "GET /api/playlists/:nonExistentId returns 404");

      // Seed a playlist and video for permission & progress testing
      const seededPlaylist = await Playlist.create({
        userId: testUser._id,
        ytPlaylistId: "PL_test_123",
        title: "Test Course",
        thumbnailUrl: "https://example.com/thumb.jpg",
        totalVideos: 1,
      });

      const seededVideo = await Video.create({
        playlistId: seededPlaylist._id,
        ytVideoId: "test_vid_001",
        title: "Lecture 1: Introduction",
        thumbnailUrl: "https://example.com/vid.jpg",
        durationInSeconds: 600,
        position: 0,
        watchedSeconds: 0,
        progressPercent: 0,
        completed: false,
      });

      // User can view own playlist
      const resDetail = await request(app).get(`/api/playlists/${seededPlaylist._id}`).set("Authorization", `Bearer ${userToken}`);
      assert(resDetail.status === 200 && resDetail.body.videos.length === 1, "GET /api/playlists/:id returns playlist details and video list");

      // Admin (other user) blocked from accessing this user's playlist
      const resForbidden = await request(app).get(`/api/playlists/${seededPlaylist._id}`).set("Authorization", `Bearer ${adminToken}`);
      assert(resForbidden.status === 403, "GET /api/playlists/:id blocks unauthorized user with 403");

      // Video progress & notes
      const resProgressBad = await request(app)
        .patch(`/api/videos/${seededVideo._id}/progress`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ watchedSeconds: -10 });
      assert(resProgressBad.status === 400, "PATCH /api/videos/:id/progress rejects negative watchedSeconds (400)");

      const resProgressGood = await request(app)
        .patch(`/api/videos/${seededVideo._id}/progress`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ watchedSeconds: 300, durationInSeconds: 600 });
      assert(resProgressGood.status === 200 && resProgressGood.body.video.progressPercent === 50, "PATCH /api/videos/:id/progress updates progress percent (50%)");

      const resNotes = await request(app)
        .patch(`/api/videos/${seededVideo._id}/notes`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ notes: "Important revision points" });
      assert(resNotes.status === 200 && resNotes.body.video.notes === "Important revision points", "PATCH /api/videos/:id/notes updates video notes");

      const resStatus = await request(app)
        .patch(`/api/videos/${seededVideo._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ completed: true });
      assert(resStatus.status === 200 && resStatus.body.video.completed === true && resStatus.body.video.progressPercent === 100, "PATCH /api/videos/:id marks video as 100% completed");
    }

    // ==========================================
    // 6. VIDEO NOTES ENDPOINTS
    // ==========================================
    console.log("\n--- 6. Testing Video Notes Endpoints ---");
    {
      const fakeVideoId = new mongoose.Types.ObjectId().toString();

      // Invalid videoId format
      const resInvalidVid = await request(app).get("/api/videos/not-an-id/notes").set("Authorization", `Bearer ${userToken}`);
      assert(resInvalidVid.status === 400, "GET /api/videos/invalid-id/notes returns 400");

      const resEmptyNotes = await request(app).get(`/api/videos/${fakeVideoId}/notes`).set("Authorization", `Bearer ${userToken}`);
      assert(resEmptyNotes.status === 200 && Array.isArray(resEmptyNotes.body.notes), "GET /api/videos/:id/notes returns empty notes array");

      // Create note validations
      const resCreateEmpty = await request(app).post(`/api/videos/${fakeVideoId}/notes`).set("Authorization", `Bearer ${userToken}`).send({});
      assert(resCreateEmpty.status === 400, "POST /api/videos/:id/notes empty body returns 400");

      const resCreateNonExistent = await request(app).post(`/api/videos/${fakeVideoId}/notes`).set("Authorization", `Bearer ${userToken}`).send({ noteText: "hello" });
      assert(resCreateNonExistent.status === 404, "POST /api/videos/:nonExistent/notes returns 404");

      // Find an actual video
      const testVid = await Video.findOne();
      const resCreateValid = await request(app).post(`/api/videos/${testVid._id}/notes`).set("Authorization", `Bearer ${userToken}`).send({
        noteText: "Timestamp 1:30 is very crucial",
        timestamp: 90,
      });
      assert(resCreateValid.status === 201 && resCreateValid.body.note.timestamp === 90, "POST /api/videos/:id/notes creates note with timestamp");

      const noteId = resCreateValid.body.note._id;

      // Update note
      const resUpdateNote = await request(app).put(`/api/notes/${noteId}`).set("Authorization", `Bearer ${userToken}`).send({
        noteText: "Updated: Timestamp 1:30 is crucial for exam",
      });
      assert(resUpdateNote.status === 200 && resUpdateNote.body.note.noteText.includes("Updated"), "PUT /api/notes/:id updates note text");

      // Delete note
      const resDeleteNote = await request(app).delete(`/api/notes/${noteId}`).set("Authorization", `Bearer ${userToken}`);
      assert(resDeleteNote.status === 200 && resDeleteNote.body.success === true, "DELETE /api/notes/:id deletes note");
    }

    // ==========================================
    // 7. PRACTICE & PROBLEM SHEETS ENDPOINTS
    // ==========================================
    console.log("\n--- 7. Testing Practice & Sheets Endpoints ---");
    {
      const resSheets = await request(app).get("/api/practice/sheets").set("Authorization", `Bearer ${userToken}`);
      assert(resSheets.status === 200 && resSheets.body.success === true && Array.isArray(resSheets.body.sheets), "GET /api/practice/sheets returns sheet list");

      const resSheetDetails = await request(app).get("/api/practice/sheet/strivers-180").set("Authorization", `Bearer ${userToken}`);
      assert(resSheetDetails.status === 200 && resSheetDetails.body.sheetTitle !== undefined, "GET /api/practice/sheet/strivers-180 returns sheet details");

      const resBadSheet = await request(app).get("/api/practice/sheet/non-existent-sheet").set("Authorization", `Bearer ${userToken}`);
      assert(resBadSheet.status === 404, "GET /api/practice/sheet/:nonExistent returns 404");

      const resUserStatus = await request(app).get("/api/practice/user-status").set("Authorization", `Bearer ${userToken}`);
      assert(resUserStatus.status === 200 && resUserStatus.body.success === true, "GET /api/practice/user-status returns user coding progress");

      // Toggle problem status
      const resToggleBad = await request(app).post("/api/practice/toggle-status").set("Authorization", `Bearer ${userToken}`).send({});
      assert(resToggleBad.status === 400, "POST /api/practice/toggle-status missing problemKey returns 400");

      const resToggleSolve = await request(app).post("/api/practice/toggle-status").set("Authorization", `Bearer ${userToken}`).send({ problemKey: "two-sum" });
      assert(resToggleSolve.status === 200 && resToggleSolve.body.isSolved === true, "POST /api/practice/toggle-status marks two-sum as solved");

      const resToggleStar = await request(app).post("/api/practice/toggle-starred").set("Authorization", `Bearer ${userToken}`).send({ problemKey: "two-sum" });
      assert(resToggleStar.status === 200 && resToggleStar.body.isStarred === true, "POST /api/practice/toggle-starred stars problem");

      // Enroll & unenroll
      const resEnroll = await request(app).post("/api/practice/enroll").set("Authorization", `Bearer ${userToken}`).send({ sheetId: "strivers-180" });
      assert(resEnroll.status === 200 && resEnroll.body.success === true, "POST /api/practice/enroll enrolls sheet");

      const resUnenroll = await request(app).post("/api/practice/unenroll").set("Authorization", `Bearer ${userToken}`).send({ sheetId: "strivers-180" });
      assert(resUnenroll.status === 200 && resUnenroll.body.success === true, "POST /api/practice/unenroll unenrolls sheet");

      // Sync submission
      const resSyncSub = await request(app).post("/api/practice/sync-submission").set("Authorization", `Bearer ${userToken}`).send({
        problemSlug: "3sum",
      });
      assert(resSyncSub.status === 200 && resSyncSub.body.success === true, "POST /api/practice/sync-submission synchronizes solved problem");

      // Protected sheet deletion restriction
      const resDelProtected = await request(app).delete("/api/practice/custom-sheet/strivers-180").set("Authorization", `Bearer ${userToken}`);
      assert(resDelProtected.status === 403, "DELETE /api/practice/custom-sheet/strivers-180 protects official sheets (403)");
    }

    // ==========================================
    // 8. PREPHUB (CS SUBJECTS & ROADMAPS)
    // ==========================================
    console.log("\n--- 8. Testing Prephub Endpoints ---");
    {
      const resSubjects = await request(app).get("/api/prephub/subjects").set("Authorization", `Bearer ${userToken}`);
      assert(resSubjects.status === 200 && Array.isArray(resSubjects.body.subjects), "GET /api/prephub/subjects returns core subjects");

      const resSubjectDetails = await request(app).get("/api/prephub/subject/os").set("Authorization", `Bearer ${userToken}`);
      assert(resSubjectDetails.status === 200 && resSubjectDetails.body.title !== undefined, "GET /api/prephub/subject/os returns OS syllabus and topics");

      const resBadSubject = await request(app).get("/api/prephub/subject/invalid-sub").set("Authorization", `Bearer ${userToken}`);
      assert(resBadSubject.status === 404, "GET /api/prephub/subject/:invalid returns 404");

      // Passkey verification
      const resPasskeyBad = await request(app).post("/api/prephub/verify-passkey").set("Authorization", `Bearer ${userToken}`).send({ passkey: "WRONGKEY" });
      assert(resPasskeyBad.status === 401, "POST /api/prephub/verify-passkey with wrong passkey returns 401");

      const resPasskeyEmpty = await request(app).post("/api/prephub/verify-passkey").set("Authorization", `Bearer ${userToken}`).send({});
      assert(resPasskeyEmpty.status === 400, "POST /api/prephub/verify-passkey with empty body returns 400");

      // Verification request
      const resReqEmpty = await request(app).post("/api/prephub/request-verification").set("Authorization", `Bearer ${userToken}`).send({});
      assert(resReqEmpty.status === 400, "POST /api/prephub/request-verification empty body returns 400");

      const resReqValid = await request(app).post("/api/prephub/request-verification").set("Authorization", `Bearer ${userToken}`).send({
        studentName: "Test Student",
        contact: "9876543210",
        rollNo: "CS2026-01",
        batch: "Batch A",
      });
      assert(resReqValid.status === 200 && resReqValid.body.success === true, "POST /api/prephub/request-verification submits verification request");

      // Admin verification endpoints
      const resAdminForbidden = await request(app).get("/api/prephub/admin/pending-verifications").set("Authorization", `Bearer ${userToken}`);
      assert(resAdminForbidden.status === 403, "GET /api/prephub/admin/pending-verifications blocks non-admin (403)");

      const resAdminAllowed = await request(app).get("/api/prephub/admin/pending-verifications").set("Authorization", `Bearer ${adminToken}`);
      assert(resAdminAllowed.status === 200 && Array.isArray(resAdminAllowed.body.requests), "GET /api/prephub/admin/pending-verifications allows admin (200)");

      const resDecideBad = await request(app).post("/api/prephub/admin/decide-verification").set("Authorization", `Bearer ${adminToken}`).send({
        userId: "invalid-id",
        decision: "approve",
      });
      assert(resDecideBad.status === 400, "POST /api/prephub/admin/decide-verification rejects invalid userId (400)");

      const resDecideGood = await request(app).post("/api/prephub/admin/decide-verification").set("Authorization", `Bearer ${adminToken}`).send({
        userId: testUser._id.toString(),
        decision: "approve",
      });
      assert(resDecideGood.status === 200 && resDecideGood.body.status === "approved", "POST /api/prephub/admin/decide-verification approves student request");
    }

    // ==========================================
    // 9. NOSQL INJECTION & SECURITY DEFENSES
    // ==========================================
    console.log("\n--- 9. Testing Security & Sanitization ---");
    {
      // NoSQL injection payload with $gt
      const resNoSqlInj = await request(app).post("/api/auth/email").send({
        email: { $gt: "" },
      });
      assert(resNoSqlInj.status === 400 && resNoSqlInj.body.success === false, "NoSQL injection { email: { $gt: '' } } is sanitized / rejected safely");

      // CORS Preflight simulation
      const resCors = await request(app).options("/api/playlists").set("Origin", "https://client-alpha-eight-45.vercel.app");
      assert(resCors.status === 204 || resCors.status === 200, "CORS preflight for *.vercel.app succeeds");
    }

    console.log("\n===============================================");
    console.log(`AUDIT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    if (failedTests.length > 0) {
      console.log(`⚠️ ${failedTests.length} TESTS FAILED:`);
      failedTests.forEach((f) => console.log(`  - ${f.testName}: ${f.details}`));
    } else {
      console.log("🎉 ALL ENDPOINTS AND EDGE CASES PASSED WITH 100% SUCCESS!");
    }
    console.log("===============================================\n");
  } catch (err) {
    console.error("FATAL ERROR IN AUDIT SUITE:", err);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

runAudit();
