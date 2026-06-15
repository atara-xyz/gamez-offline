// Generates a local Certificate Authority + a server certificate so the laptop can
// serve the app over HTTPS on the LAN. iOS needs a SECURE origin (https) to allow
// offline/PWA mode — a plain http://<ip> URL won't work. You install the CA
// (certs/rootCA.pem) on the iPad once and trust it; then https://<ip>:4173 is valid.
//
// Run: npm run certs -- 192.168.50.8   (pass your laptop's Wi-Fi IP; it's also
// auto-detected if omitted). Re-run if your IP changes.
import forge from 'node-forge';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CERTS = resolve(root, 'certs');
const PUB = resolve(root, 'public');
mkdirSync(CERTS, { recursive: true });

// Collect host identities: localhost, loopback, and LAN IPv4s (+ any passed in).
const argIps = process.argv.slice(2).filter((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a));
const lanIps = new Set(argIps);
for (const ifaces of Object.values(networkInterfaces())) {
  for (const i of ifaces || []) {
    if (i.family === 'IPv4' && !i.internal) lanIps.add(i.address);
  }
}
const ips = ['127.0.0.1', ...lanIps];
console.log('Certifying hosts: localhost,', ips.join(', '));

const attrs = (cn) => [{ name: 'commonName', value: cn }, { name: 'organizationName', value: 'Geo Games' }];
function keypair() { return forge.pki.rsa.generateKeyPair(2048); }
function serial() { return forge.util.bytesToHex(forge.random.getBytesSync(16)); }
const DAY = 86400000;
const now = Date.now();
function validDays(cert, days) {
  cert.validity.notBefore = new Date(now - DAY); // yesterday, to dodge clock skew
  cert.validity.notAfter = new Date(now + days * DAY);
}

// ---- Certificate Authority ----
const caKeys = keypair();
const ca = forge.pki.createCertificate();
ca.publicKey = caKeys.publicKey;
ca.serialNumber = serial();
validDays(ca, 3650);
ca.setSubject(attrs('Geo Games Local CA'));
ca.setIssuer(attrs('Geo Games Local CA'));
ca.setExtensions([
  { name: 'basicConstraints', cA: true, critical: true },
  { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
]);
ca.sign(caKeys.privateKey, forge.md.sha256.create());

// ---- Server certificate signed by the CA ----
const srvKeys = keypair();
const srv = forge.pki.createCertificate();
srv.publicKey = srvKeys.publicKey;
srv.serialNumber = serial();
validDays(srv, 800); // iOS distrusts server certs valid > 825 days
srv.setSubject(attrs('Geo Games'));
srv.setIssuer(ca.subject.attributes);
const altNames = [
  { type: 2, value: 'localhost' },
  ...ips.map((ip) => ({ type: 7, ip })),
];
srv.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true },
  { name: 'subjectAltName', altNames },
]);
srv.sign(caKeys.privateKey, forge.md.sha256.create());

const caPem = forge.pki.certificateToPem(ca);
writeFileSync(resolve(CERTS, 'rootCA.pem'), caPem);
writeFileSync(resolve(CERTS, 'cert.pem'), forge.pki.certificateToPem(srv));
writeFileSync(resolve(CERTS, 'key.pem'), forge.pki.privateKeyToPem(srvKeys.privateKey));
// Serve the CA so the iPad can download it from the app itself.
mkdirSync(PUB, { recursive: true });
writeFileSync(resolve(PUB, 'rootCA.pem'), caPem);
copyFileSync(resolve(CERTS, 'rootCA.pem'), resolve(PUB, 'rootCA.crt')); // iOS prefers .crt to offer install

console.log('Wrote certs/{rootCA.pem,cert.pem,key.pem} and public/rootCA.{pem,crt}');
console.log('Install public/rootCA.crt on the iPad and trust it (see README).');
