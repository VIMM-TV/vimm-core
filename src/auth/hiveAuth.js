const { PrivateKey, Signature } = require('@hiveio/dhive');
const crypto = require('crypto');

/**
 * Generates a challenge string for Hive authentication
 * @returns {string} A random challenge string
 */
function generateChallenge() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies a Hive signature against a challenge and username
 * @param {string} username - Hive username
 * @param {string} challenge - Challenge string that was signed
 * @param {string} signature - Signature from Hive Keychain
 * @param {string} publicKey - Public posting key from the user's account
 * @returns {boolean} True if signature is valid
 */
function verifyHiveSignature(username, challenge, signature, publicKey) {
  try {
    // Create the message that was signed (same format as Keychain)
    const message = `${username}${challenge}`;
    
    // Verify the signature
    const sig = Signature.fromString(signature);
    const key = PrivateKey.fromString(publicKey);
    
    return sig.verify(Buffer.from(message, 'utf8'), key.createPublic());
  } catch (error) {
    console.error('Error verifying Hive signature:', error);
    return false;
  }
}

/**
 * Alternative verification using public key directly (more common case)
 * @param {string} username - Hive username
 * @param {string} challenge - Challenge string that was signed  
 * @param {string} signature - Signature from Hive Keychain
 * @param {string} publicKey - Public posting key (STM format)
 * @returns {boolean} True if signature is valid
 */
function verifyHiveSignatureWithPublicKey(username, challenge, signature, publicKey) {
  try {
    // Create the message that was signed
    const message = `${username}${challenge}`;
    const messageHash = crypto.createHash('sha256').update(message, 'utf8').digest();
    
    // Verify signature
    const sig = Signature.fromString(signature);
    const pubKey = PrivateKey.fromString(publicKey).createPublic();
    
    return sig.verify(messageHash, pubKey);
  } catch (error) {
    console.error('Error verifying Hive signature with public key:', error);
    return false;
  }
}

module.exports = {
  generateChallenge,
  verifyHiveSignature,
  verifyHiveSignatureWithPublicKey
};