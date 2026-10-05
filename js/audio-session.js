const VALID_SESSION_TYPES = new Set(['auto', 'ambient', 'playback', 'transient', 'transient-solo', 'play-and-record']);

let lastAttempt = { supported: false, configuredType: 'unsupported', error: null };

/** Configure nonessential game audio so supported platforms apply their ambient policy. */
export function configureAmbientAudioSession(session = globalThis.navigator?.audioSession) {
  if (!session || typeof session !== 'object' || !('type' in session)) {
    lastAttempt = { supported: false, configuredType: 'unsupported', error: null };
    return { ...lastAttempt };
  }
  try {
    session.type = 'ambient';
    const configuredType = typeof session.type === 'string' ? session.type : 'unknown';
    lastAttempt = {
      supported: configuredType === 'ambient',
      configuredType,
      error: configuredType === 'ambient' ? null : 'ambient type was not accepted'
    };
  } catch (error) {
    lastAttempt = { supported: false, configuredType: String(session.type || 'unknown'), error: error?.message || 'session type unavailable' };
  }
  return { ...lastAttempt };
}

export function audioSessionDiagnostics(session = globalThis.navigator?.audioSession) {
  const supported = !!session && typeof session === 'object' && 'type' in session;
  let configuredType = supported ? String(session.type || 'unknown') : 'unsupported';
  return {
    supported,
    configuredType,
    requestedType: 'ambient',
    error: lastAttempt.error
  };
}

