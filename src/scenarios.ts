import type { ISiemEvent } from './types.js';

export const SCENARIOS = {
  BRUTE_FORCE: (targetIp: string, username: string): ISiemEvent => ({
    eventType: 'auth_failure',
    severity: 'medium',
    source: 'ssh-daemon',
    ip: targetIp,
    actor: username,
    message: `Failed password for ${username} from ${targetIp} port 22 ssh2`,
    tags: ['attack', 'brute-force'],
  }),

  MALWARE_BEACON: (hostIp: string): ISiemEvent => ({
    eventType: 'network_outbound',
    severity: 'critical',
    source: 'edr-agent',
    ip: hostIp,
    message: `Suspicious outbound connection to known C2 domain: evil-cnc.net`,
    payload: {
      process: 'powershell.exe',
      destination: '45.77.12.33',
    },
  }),

  SUCCESSFUL_LOGIN: (ip: string, username: string): ISiemEvent => ({
    eventType: 'auth_success',
    severity: 'low',
    source: 'ssh-daemon',
    ip,
    actor: username,
    message: `Accepted password for ${username} from ${ip}`,
  }),
};