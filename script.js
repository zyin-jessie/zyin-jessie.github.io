const levels = [
  {
    task: 'Generate an Ed25519 key pair (the most secure algorithm).',
    hint: 'Use <code>-t ed25519</code>',
    check: cmd => cmd.t === 'ed25519',
    passMsg: '✓ Ed25519 key — modern, fast, and secure.',
    failMsg: 'Ed25519 is the recommended algorithm. Use <code>-t ed25519</code>.',
    baseScore: 15,
  },
  {
    task: 'Generate an RSA 4096-bit key (high security, wide compatibility).',
    hint: 'Use <code>-t rsa -b 4096</code>',
    check: cmd => cmd.t === 'rsa' && cmd.b === 4096,
    passMsg: '✓ RSA 4096 — strong classic choice.',
    failMsg: 'For RSA, always use <code>-b 4096</code> for adequate security.',
    baseScore: 15,
  },
  {
    task: 'Add a passphrase to your Ed25519 key.',
    hint: 'Use <code>-t ed25519 -N "your passphrase"</code>',
    check: cmd => cmd.t === 'ed25519' && cmd.N && cmd.N.length >= 4,
    passMsg: '✓ Passphrase protected — your key is encrypted at rest.',
    failMsg: 'Use <code>-N</code> with a passphrase (at least 4 chars).',
    baseScore: 20,
  },
  {
    task: 'Maximize key derivation rounds with <code>-a</code> (100 rounds) for an Ed25519 key.',
    hint: 'Use <code>-t ed25519 -a 100</code>',
    check: cmd => cmd.t === 'ed25519' && cmd.a >= 100,
    passMsg: '✓ 100 rounds — brute-force resistance maximized.',
    failMsg: 'Use <code>-a 100</code> to set the maximum number of KDF rounds.',
    baseScore: 20,
  },
  {
    task: 'Ultimate security: Ed25519 + passphrase + 100 rounds + comment.',
    hint: 'Use <code>-t ed25519 -a 100 -N "pass" -C "my-key"</code>',
    check: cmd => cmd.t === 'ed25519' && cmd.a >= 100 && cmd.N && cmd.N.length >= 4 && cmd.C && cmd.C.length > 0,
    passMsg: '✓ Maximum security configuration — flawless.',
    failMsg: 'Combine <code>-t ed25519 -a 100 -N "..." -C "..."</code>.',
    baseScore: 30,
  },
];

let currentLevel = 0;
let totalScore = 0;
let levelAttempts = 0;
let hintUsed = false;

const scoreVal = document.getElementById('score-val');
const output = document.getElementById('output');
const input = document.getElementById('cmd-input');
const taskText = document.getElementById('task-text');
const hintText = document.getElementById('hint-text');
const feedback = document.getElementById('feedback');
const submitBtn = document.getElementById('submit-btn');
const hintBtn = document.getElementById('hint-btn');
const resetBtn = document.getElementById('reset-btn');
const toast = document.getElementById('toast');
let toastTimeout;

function showToast(msg, duration = 2200) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
}

function updateScore() {
  scoreVal.textContent = totalScore;
  scoreVal.className = 'val ' + (totalScore >= 70 ? 'good' : totalScore >= 35 ? 'mid' : 'bad');
}

function loadLevel(idx) {
  if (idx >= levels.length) {
    showComplete();
    return;
  }
  const lv = levels[idx];
  taskText.innerHTML = lv.task;
  hintText.innerHTML = lv.hint;
  hintText.style.display = 'none';
  hintUsed = false;
  levelAttempts = 0;
  input.value = '';
  input.disabled = false;
  submitBtn.disabled = false;
  input.focus();

  document.querySelectorAll('.level-dot').forEach((d, i) => {
    d.classList.toggle('done', i < idx);
    d.classList.toggle('active', i === idx);
  });

  if (idx > 0) {
    addLine(`info`, `── Level ${idx + 1} ──`);
  }
  feedback.innerHTML = '';
  document.querySelector('#btn-row').style.display = 'flex';
}

function showComplete() {
  input.disabled = true;
  submitBtn.disabled = true;
  document.querySelector('#btn-row').style.display = 'none';

  const scoreText = `${totalScore} / 100`;

  confetti({
    particleCount: 200,
    spread: 80,
    origin: { y: 0.5 },
  });

  Swal.fire({
    title: '◈ All Challenges Complete!',
    html: `<span style="color:#5a6e82;font-size:13px">Final security score: <strong style="color:#c5c8d0">${scoreText}</strong></span>`,
    icon: 'success',
    background: '#13161c',
    color: '#c5c8d0',
    confirmButtonColor: '#0d47a0',
    confirmButtonText: 'Play Again',
    showCancelButton: true,
    cancelButtonText: 'Close',
    cancelButtonColor: '#1a2030',
    focusConfirm: false,
  }).then(result => {
    if (result.isConfirmed) {
      document.getElementById('play-again-btn').click();
    }
  });
}

function addLine(cls, text) {
  const d = document.createElement('div');
  d.className = 'line ' + cls;
  d.textContent = text;
  output.appendChild(d);
  output.scrollTop = output.scrollHeight;
}

function addBadge(cls, text) {
  const b = document.createElement('span');
  b.className = 'badge ' + cls;
  b.textContent = text;
  feedback.appendChild(b);
}

function simulateKeygen(cmd) {
  const lines = [];
  const t = cmd.t || 'ed25519';
  const bits = cmd.b || (t === 'ed25519' ? 256 : t === 'ecdsa' ? 256 : 2048);
  const a = cmd.a || 16;
  const hasPass = cmd.N && cmd.N.length >= 4;

  lines.push({ cls: 'info', text: `Generating public/private ${t} key pair.` });
  lines.push({ cls: 'info', text: `Bits: ${bits}  Rounds: ${a}` });

  if (hasPass) {
    lines.push({ cls: 'info', text: `Passphrase: encrypted (${cmd.N.length} characters)` });
  }

  const phases = [
    { pct: 0, msg: 'Initializing entropy pool...' },
    { pct: 20, msg: t === 'ed25519' ? 'Curve25519 scalar multiplication...' : t === 'rsa' ? 'Finding large primes...' : 'Generating parameters...' },
    { pct: 45, msg: t === 'rsa' ? 'Miller-Rabin primality tests...' : 'Performing key operations...' },
    { pct: 70, msg: hasPass ? 'Deriving encryption key (bcrypt)...' : 'No passphrase — key unencrypted.' },
    { pct: 90, msg: 'Writing key files...' },
    { pct: 100, msg: 'Key generated successfully.' },
  ];

  let pi = 0;
  const progInterval = setInterval(() => {
    if (pi >= phases.length) {
      clearInterval(progInterval);
      const comment = cmd.C || 'user@ssh-forge';
      const typeStr = t === 'ed25519' ? 'sk-ssh-ed25519' : t === 'rsa' ? 'ssh-rsa' : t === 'ecdsa' ? 'sk-ecdsa-sha2-nistp256' : 'ssh-ed25519';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let keyData = '';
      const klen = t === 'ed25519' ? 52 : bits >= 4096 ? 120 : 80;
      for (let i = 0; i < klen; i++) keyData += chars[Math.floor(Math.random() * chars.length)];
      const pubKey = `${typeStr} AAAA${keyData} ${comment}`;

      addLine('ok', `Your public key has been saved in ~/.ssh/id_${t}.pub`);
      addLine('ok', `Your private key has been saved in ~/.ssh/id_${t}`);
      addLine('info', `The key fingerprint is:`);
      addLine('highlight', `SHA256:${btoa(pubKey).slice(0, 44)} ${comment}`);
      addLine('info', `The key's randomart image is:`);
      addLine('info', `+--[${t.toUpperCase()} ${bits}]--+`);
      for (let i = 0; i < 7; i++) {
        let row = '|';
        for (let j = 0; j < 13; j++) row += '.o+*O'[Math.floor(Math.random() * 5)];
        row += '|';
        addLine('info', row);
      }
      addLine('info', `+----[SHA256]-----+`);
      return;
    }

    const phase = phases[pi];
    if (phase.pct > 0) {
      addLine('info', phase.msg);
    }
    pi++;
  }, 400);

  return lines;
}

function parseCommand(cmd) {
  const parts = cmd.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const result = {};
  let i = 0;

  if (parts[0] && !['ssh-keygen', 'sshkey-gen'].includes(parts[0])) {
    return { error: 'Invalid command.' };
  }

  while (i < parts.length) {
    const p = parts[i];
    if (p === 'ssh-keygen') { i++; continue; }
    if (p.startsWith('-')) {
      const flag = p.replace(/^-+/, '');
      if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        let val = parts[i + 1].replace(/^"|"$/g, '');
        result[flag] = /^\d+$/.test(val) ? Number(val) : val;
        i += 2;
      } else {
        result[flag] = true;
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

function handleSubmit() {
  const raw = input.value.trim();
  if (!raw) return;

  addLine('info', `$ ${raw}`);

  const cmd = parseCommand(raw);

  if (cmd.error) {
    addLine('err', cmd.error);
    showToast('Invalid command — try again', 1800);
    input.value = '';
    input.focus();
    return;
  }

  if (!cmd.t && !cmd.b && !cmd.N && !cmd.a && !cmd.C) {
    addLine('warn', '⚠ No flags detected. Specify at least a key type with <code>-t</code>.');
    showToast('Add flags to your command', 1800);
    input.value = '';
    input.focus();
    return;
  }

  const lv = levels[currentLevel];
  const passed = lv.check(cmd);

  simulateKeygen(cmd);

  feedback.innerHTML = '';
  levelAttempts++;

  if (cmd.t) {
    if (cmd.t === 'ed25519') addBadge('good', 'ed25519 ✓');
    else if (cmd.t === 'rsa') addBadge('good', 'RSA');
    else if (cmd.t === 'ecdsa') addBadge('info', 'ECDSA');
    else if (cmd.t === 'dsa') addBadge('err', 'DSA — deprecated!');
  }
  if (cmd.b) {
    if (cmd.b >= 4096) addBadge('good', `${cmd.b}-bit ✓`);
    else if (cmd.b >= 2048) addBadge('info', `${cmd.b}-bit`);
    else addBadge('err', `${cmd.b}-bit — too weak!`);
  }
  if (cmd.N) {
    if (cmd.N.length >= 12) addBadge('good', 'strong passphrase');
    else if (cmd.N.length >= 4) addBadge('warn', 'passphrase (short)');
    else addBadge('err', 'passphrase too short');
  }
  if (cmd.a) {
    if (cmd.a >= 100) addBadge('good', `rounds ${cmd.a} ✓`);
    else if (cmd.a >= 64) addBadge('warn', `rounds ${cmd.a} (ok)`);
    else addBadge('info', `rounds ${cmd.a}`);
  }
  if (cmd.C) addBadge('info', 'comment added');

  if (cmd.t === 'dsa') addBadge('err', 'DSA is deprecated! -20');
  if (cmd.b && cmd.b < 2048) addBadge('err', 'Weak key size! -15');
  if (cmd.t === 'rsa' && !cmd.b) addBadge('warn', 'Default RSA bits are 2048 — use -b 4096');
  if (cmd.t === 'ed25519' && cmd.b) addBadge('warn', '-b is ignored for Ed25519 (fixed 256)');

  let extraScore = 0;
  if (cmd.t === 'ed25519') extraScore += 5;
  if (cmd.b && cmd.b >= 4096) extraScore += 5;
  if (cmd.N && cmd.N.length >= 12) extraScore += 5;
  if (cmd.a && cmd.a >= 100) extraScore += 5;
  if (cmd.t === 'dsa') extraScore -= 20;
  if (cmd.b && cmd.b < 2048) extraScore -= 15;

  setTimeout(() => {
    if (passed) {
      const points = lv.baseScore + (hintUsed ? 0 : 5) + (levelAttempts === 1 ? 5 : 0) + extraScore;
      totalScore = Math.max(0, Math.min(100, totalScore + points));
      updateScore();
      addLine('ok', `✓ Level ${currentLevel + 1} complete! +${points} points`);
      showToast(`+${points} pts — Level cleared!`, 2000);
      currentLevel++;
      if (currentLevel < levels.length) {
        setTimeout(() => loadLevel(currentLevel), 800);
      } else {
        setTimeout(() => loadLevel(currentLevel), 800);
      }
    } else {
      addLine('warn', `✗ ${lv.failMsg}`);
      showToast('Not quite — check the hint', 1800);
    }
    input.value = '';
    input.focus();
  }, levels.length * 400 + 200);
}

submitBtn.addEventListener('click', handleSubmit);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSubmit();
});

hintBtn.addEventListener('click', () => {
  hintUsed = true;
  hintText.style.display = 'block';
  showToast('Hint revealed — -5 bonus', 1800);
});

resetBtn.addEventListener('click', () => {
  if (currentLevel === 0 && totalScore === 0) return;
  if (confirm('Reset all progress?')) {
    currentLevel = 0;
    totalScore = 0;
    updateScore();
    output.innerHTML = '<div class="line info">█ Progress reset. Type a command to begin.</div>';
    feedback.innerHTML = '';
    document.querySelector('#btn-row').style.display = 'flex';
    loadLevel(0);
    showToast('Progress reset', 1200);
  }
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  currentLevel = 0;
  totalScore = 0;
  updateScore();
  output.innerHTML = '<div class="line info">█ Welcome back! Type a command to begin.</div>';
  feedback.innerHTML = '';
  document.querySelector('#btn-row').style.display = 'flex';
  loadLevel(0);
  showToast('Restarting...', 1200);
});

updateScore();
loadLevel(0);
