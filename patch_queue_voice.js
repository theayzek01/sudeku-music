const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/player/Queue.js');
let code = fs.readFileSync(file, 'utf8');

// Normalize line endings to \n
code = code.replace(/\r\n/g, '\n');

// Helper to replace text block
function replaceBlock(oldBlock, newBlock) {
  if (!code.includes(oldBlock)) {
    console.error("Could not find block:\n" + oldBlock);
    process.exit(1);
  }
  code = code.replace(oldBlock, newBlock);
}

// 1. Update imports
const oldImports = [
  "const {",
  "  createAudioPlayer,",
  "  createAudioResource,",
  "  AudioPlayerStatus,",
  "  joinVoiceChannel,",
  "  VoiceConnectionStatus,",
  "  entersState",
  "} = require('@discordjs/voice');"
].join('\n');

const newImports = [
  "const {",
  "  createAudioPlayer,",
  "  createAudioResource,",
  "  AudioPlayerStatus,",
  "  joinVoiceChannel,",
  "  VoiceConnectionStatus,",
  "  entersState,",
  "  VoiceConnectionDisconnectReason,",
  "  NoSubscriberBehavior",
  "} = require('@discordjs/voice');"
].join('\n');

replaceBlock(oldImports, newImports);

// 2. Update child_process import to include spawn
const oldCpImport = "const { exec } = require('child_process');";
const newCpImport = "const { exec, spawn } = require('child_process');";
replaceBlock(oldCpImport, newCpImport);

// 3. Add getStreamWithYtDlp helper function below getYtDlpCommand
const newHelper = [
  "",
  "function getStreamWithYtDlp(ytUrl) {",
  "  const ytDlpCmd = getYtDlpCommand().replace(/\"/g, '');",
  "  const child = spawn(ytDlpCmd, [",
  "    '-f', 'bestaudio',",
  "    '--no-playlist',",
  "    '--buffer-size', '16K',",
  "    '-o', '-',",
  "    ytUrl",
  "  ], { stdio: ['ignore', 'pipe', 'ignore'] });",
  "",
  "  child.stdout.childProcess = child;",
  "  return child.stdout;",
  "}"
].join('\n');

// Find the end of getYtDlpCommand function
const ytdlpIndex = code.indexOf('function getYtDlpCommand()');
if (ytdlpIndex === -1) {
  console.error("Could not find getYtDlpCommand in Queue.js");
  process.exit(1);
}
const targetStr = "  return 'yt-dlp';\n}";
const targetIdx = code.indexOf(targetStr, ytdlpIndex);
if (targetIdx === -1) {
  console.error("Could not find end of getYtDlpCommand");
  process.exit(1);
}

const insertionPoint = targetIdx + targetStr.length;
code = code.substring(0, insertionPoint) + newHelper + code.substring(insertionPoint);

// 4. Update cleanupStreams to kill child process if present
const oldCleanup = [
  "  cleanupStreams() {",
  " if (this.currentStream) {",
  " try {",
  " if (typeof this.currentStream.destroy === 'function') {",
  " this.currentStream.destroy();",
  " }",
  " } catch (e) {",
  " console.error(\"[Queue] Error destroying currentStream:\", e);",
  " }",
  " this.currentStream = null;",
  " }"
].join('\n');

// Note: In the file, cleanupStreams has 2 spaces indentation
const oldCleanupActual = [
  "  cleanupStreams() {",
  " if (this.currentStream) {",
  " try {",
  " if (typeof this.currentStream.destroy === 'function') {",
  " this.currentStream.destroy();",
  " }",
  " } catch (e) {",
  " console.error(\"[Queue] Error destroying currentStream:\", e);",
  " }",
  " this.currentStream = null;",
  " }"
].join('\n');

// Let's check why the exact indentation failed. Ah!
// Let's look at how the file is actually indented:
// It has "  cleanupStreams() {" (two spaces) but inside it has " if (this.currentStream) {" (one space).
// Let's use a simpler replace block that matches only the signature and first few lines of cleanupStreams:
const oldCleanupSimple = [
  "  cleanupStreams() {",
  " if (this.currentStream) {",
  " try {",
  " if (typeof this.currentStream.destroy === 'function') {",
  " this.currentStream.destroy();",
  " }",
  " } catch (e) {",
  " console.error(\"[Queue] Error destroying currentStream:\", e);",
  " }",
  " this.currentStream = null;",
  " }"
].join('\n');

// Wait! In the code chunk we printed:
// "cleanupStreams() {\n if (this.currentStream) {\n try {\n if (typeof this.currentStream.destroy === 'function') {\n"
// It did NOT have any leading spaces on `cleanupStreams() {`!
// Look at the code chunk from node -e:
// "cleanupStreams() {\n if (this.currentStream) {\n try {\n..."
// So there are ZERO spaces before cleanupStreams!
const oldCleanupZeroIndent = [
  "cleanupStreams() {",
  " if (this.currentStream) {",
  " try {",
  " if (typeof this.currentStream.destroy === 'function') {",
  " this.currentStream.destroy();",
  " }",
  " } catch (e) {",
  " console.error(\"[Queue] Error destroying currentStream:\", e);",
  " }",
  " this.currentStream = null;",
  " }"
].join('\n');

const newCleanup = [
  "cleanupStreams() {",
  "    if (this.currentStream) {",
  "      try {",
  "        if (this.currentStream.childProcess) {",
  "          this.currentStream.childProcess.kill('SIGKILL');",
  "        }",
  "        if (typeof this.currentStream.destroy === 'function') {",
  "          this.currentStream.destroy();",
  "        }",
  "      } catch (e) {",
  "        console.error(\"[Queue] Error destroying currentStream:\", e);",
  "      }",
  "      this.currentStream = null;",
  "    }"
].join('\n');

replaceBlock(oldCleanupZeroIndent, newCleanup);

// 5. Update initVoice with reconnection logic and NoSubscriberBehavior
const oldInitVoiceZeroIndent = [
  "initVoice() {",
  " this.connection = joinVoiceChannel({",
  " channelId: this.voiceChannelId,",
  " guildId: this.guildId,",
  " adapterCreator: this.client.guilds.cache.get(this.guildId).voiceAdapterCreator",
  " });",
  "",
  " this.player = createAudioPlayer();",
  " this.connection.subscribe(this.player);",
  "",
  " // Set up connection event listeners",
  " this.connection.on(VoiceConnectionStatus.Disconnected, async () => {",
  " try {",
  " await Promise.race([",
  " entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),",
  " entersState(this.connection, VoiceConnectionStatus.Connecting, 5000)",
  " ]);",
  " // Reconnected!",
  " } catch (error) {",
  " // Real disconnect",
  " this.destroy();",
  " }",
  " });"
].join('\n');

const newInitVoice = [
  "initVoice() {",
  "    this.connection = joinVoiceChannel({",
  "      channelId: this.voiceChannelId,",
  "      guildId: this.guildId,",
  "      adapterCreator: this.client.guilds.cache.get(this.guildId).voiceAdapterCreator",
  "    });",
  "",
  "    this.player = createAudioPlayer({",
  "      behaviors: {",
  "        noSubscriber: NoSubscriberBehavior.Play",
  "      }",
  "    });",
  "    this.connection.subscribe(this.player);",
  "",
  "    this.rejoinAttempts = 0;",
  "",
  "    // Set up connection event listeners",
  "    this.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {",
  "      console.warn(`[Voice Connection] Disconnected from channel in guild ${this.guildId}. Reason: ${newState.reason}, Close code: ${newState.closeCode}`);",
  "",
  "      if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {",
  "        try {",
  "          await entersState(this.connection, VoiceConnectionStatus.Connecting, 2000);",
  "          console.log(`[Voice Connection] Reconnecting/Moved in guild ${this.guildId}.`);",
  "        } catch {",
  "          console.log(`[Voice Connection] Kicked/Disconnected in guild ${this.guildId}.`);",
  "          this.destroy();",
  "        }",
  "      } else if (this.rejoinAttempts < 5) {",
  "        this.rejoinAttempts++;",
  "        const delay = this.rejoinAttempts * 2000;",
  "        console.log(`[Voice Connection] Temporary disconnect in guild ${this.guildId}. Retrying in ${delay}ms... (Attempt ${this.rejoinAttempts}/5)`);",
  "        await new Promise(resolve => setTimeout(resolve, delay));",
  "        try {",
  "          if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {",
  "            this.connection.rejoin();",
  "          }",
  "        } catch (err) {",
  "          console.error(`[Voice Connection] Rejoin attempt failed:`, err);",
  "        }",
  "      } else {",
  "        console.warn(`[Voice Connection] Too many reconnect attempts failed in guild ${this.guildId}. Destroying queue.`);",
  "        this.destroy();",
  "      }",
  "    });",
  "",
  "    this.connection.on(VoiceConnectionStatus.Ready, () => {",
  "      console.log(`[Voice Connection] Ready in guild ${this.guildId}.`);",
  "      this.rejoinAttempts = 0;",
  "    });"
].join('\n');

replaceBlock(oldInitVoiceZeroIndent, newInitVoice);

// 6. Update playTrack fallback code
const oldPlayTrackFallback = [
  "    try {",
  "      console.log(`[Queue] play-dl ile stream aranıyor: ${playUrl}`);",
  "      const stream = await play.stream(playUrl, { quality: 2, discordPlayerCompatible: true });",
  "      streamStream = stream.stream;",
  "      inputType = stream.type;",
  "    } catch (playDlErr) {",
  "      console.warn(`[Queue] play-dl ile stream alınamadı, yt-dlp fallback kullanılıyor. Hata: ${playDlErr.message || playDlErr}`);",
  "      try {",
  "        const directUrl = await getDirectUrlWithYtDlp(playUrl);",
  "        console.log(`[Queue] yt-dlp ile doğrudan stream URL'si alındı.`);",
  "        streamStream = await getStreamFromUrl(directUrl);",
  "        inputType = 'arbitrary';",
  "      } catch (ytDlpErr) {",
  "        console.error(`[Queue] yt-dlp fallback de başarısız oldu!`, ytDlpErr);",
  "        throw new Error(`Yayın başlatılamadı (play-dl ve yt-dlp hatası): ${ytDlpErr.message}`);",
  "      }",
  "    }"
].join('\n');

const newPlayTrackFallback = [
  "    try {",
  "      console.log(`[Queue] play-dl ile stream aranıyor: ${playUrl}`);",
  "      const stream = await play.stream(playUrl, { quality: 2, discordPlayerCompatible: true });",
  "      streamStream = stream.stream;",
  "      inputType = stream.type;",
  "    } catch (playDlErr) {",
  "      console.warn(`[Queue] play-dl ile stream alınamadı, yt-dlp fallback kullanılıyor. Hata: ${playDlErr.message || playDlErr}`);",
  "      try {",
  "        console.log(`[Queue] yt-dlp ile doğrudan stream başlatılıyor...`);",
  "        streamStream = getStreamWithYtDlp(playUrl);",
  "        inputType = 'arbitrary';",
  "      } catch (ytDlpErr) {",
  "        console.error(`[Queue] yt-dlp fallback de başarısız oldu!`, ytDlpErr);",
  "        throw new Error(`Yayın başlatılamadı (play-dl ve yt-dlp hatası): ${ytDlpErr.message}`);",
  "      }",
  "    }"
].join('\n');

replaceBlock(oldPlayTrackFallback, newPlayTrackFallback);

fs.writeFileSync(file, code, 'utf8');
console.log("Successfully patched src/player/Queue.js");
