const INJECTION_PATTERNS = [
  /ignore (all |previous |above )?instructions/i,
  /you are now/i,
  /forget (everything|all|previous)/i,
  /reveal (your|the) (system )?prompt/i,
  /show (me )?(your )?(api key|secret|password)/i,
  /developer mode/i,
  /jailbreak/i,
];

export function filterPromptInjection(req, res, next) {
  const userInput = req.body.message || req.body.teks_pesan || req.validatedData?.message || '';
  const isAttack = INJECTION_PATTERNS.some((pattern) => pattern.test(userInput));

  if (isAttack) {
    console.warn('[SECURITY] Prompt injection attempt:', {
      userId: req.user?.id,
      input: String(userInput).substring(0, 100),
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({ error: 'Input tidak valid' });
  }
  next();
}

export function validateAIOutput(output) {
  const SENSITIVE = [
    /sk-[a-zA-Z0-9]{20,}/,
    /eyJ[a-zA-Z0-9]{20,}/,
  ];
  if (SENSITIVE.some((pattern) => pattern.test(output))) {
    console.error('[SECURITY] AI output contains sensitive data - blocked');
    return 'Terjadi kesalahan, silakan coba lagi.';
  }
  return output;
}
