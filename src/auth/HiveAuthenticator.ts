import { Client, PublicKey, Signature, cryptoUtils } from '@hiveio/dhive';

interface KeyAuth {
  key_auths: [string, number][];
  weight_threshold: number;
  account_auths: any[];
}

interface HiveAccount {
  name: string;
  posting: KeyAuth;
  created: string;
  posting_json_metadata: string;
  json_metadata: string;
  reputation: string | number;
}

export class HiveAuthenticator {
  private client: Client;
  private memoCache: Map<string, PublicKey>;
  private cacheDuration: number; // milliseconds

  constructor() {
    this.client = new Client([
      'https://api.hive.blog',
      'https://api.hivekings.com',
      'https://anyx.io',
      'https://api.openhive.network'
    ]);
    this.memoCache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async verify(username: string, signature: string, message?: string): Promise<boolean> {
    try {
      // Get user's public memo key
      const publicKey = await this.getUserPublicKey(username);
      if (!publicKey) return false;

      // If no message provided, use a default message
      const verificationMessage = message || 'vimm-auth';

      // Verify the signature
      return this.verifySignature(verificationMessage, publicKey, signature);
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  }

  private verifySignature(message: string, publicKey: PublicKey, signatureString: string): boolean {
    try {
      // Create double SHA256 hash of the message
      const messageBuffer = Buffer.from(message, 'utf8');
      const messageHash = cryptoUtils.sha256(messageBuffer);

      // Convert the signature string to a Signature object
      const signature = Signature.fromString(signatureString);

      // Use recover public key method to verify
      const recoveredKey = signature.recover(messageHash);
      return recoveredKey.toString() === publicKey.toString();
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  async getUserPublicKey(username: string): Promise<PublicKey | null> {
    try {
      // Check cache first
      const cachedKey = this.memoCache.get(username);
      if (cachedKey) {
        return cachedKey;
      }

      // Fetch account info from Hive
      const accounts = await this.client.database.getAccounts([username]);
      const account = accounts[0] as HiveAccount;
      
      if (!account) {
        throw new Error(`Account ${username} not found`);
      }

      // Extract the public key string from key_auths
      const publicKeyString = account.posting.key_auths[0][0];
      if (typeof publicKeyString !== 'string') {
        throw new Error('Invalid public key format');
      }

      // Convert to PublicKey object
      const publicKey = PublicKey.fromString(publicKeyString);

      // Cache the key
      this.memoCache.set(username, publicKey);
      setTimeout(() => {
        this.memoCache.delete(username);
      }, this.cacheDuration);

      return publicKey;
    } catch (error) {
      console.error('Error fetching public key:', error);
      return null;
    }
  }

  async validatePermissions(username: string, requiredAuth: 'posting' | 'active'): Promise<boolean> {
    try {
      const accounts = await this.client.database.getAccounts([username]);
      const account = accounts[0] as HiveAccount;
      if (!account) return false;

      // Check if account is in good standing
      if (account.posting_json_metadata) {
        const metadata = JSON.parse(account.posting_json_metadata);
        if (metadata.disabled || metadata.banned) return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating permissions:', error);
      return false;
    }
  }

  async getAccountMetadata(username: string): Promise<any> {
    try {
      const accounts = await this.client.database.getAccounts([username]);
      const account = accounts[0] as HiveAccount;
      if (!account) {
        throw new Error(`Account ${username} not found`);
      }

      return {
        name: account.name,
        created: account.created,
        reputation: this.calculateReputation(account.reputation),
        metadata: account.json_metadata ? JSON.parse(account.json_metadata) : {},
        postingMetadata: account.posting_json_metadata ? JSON.parse(account.posting_json_metadata) : {}
      };
    } catch (error) {
      console.error('Error fetching account metadata:', error);
      return null;
    }
  }

  private calculateReputation(reputation: string | number): number {
    if (typeof reputation === 'string') {
      reputation = parseInt(reputation);
    }
    
    if (reputation === 0) return 25;

    const neg = reputation < 0;
    const repLevel = Math.log10(Math.abs(reputation));
    let reputationPoint = Math.max(repLevel - 9, 0);
    
    if (reputationPoint < 0) reputationPoint = 0;
    if (neg) reputationPoint *= -1;
    
    const result = reputationPoint * 9 + 25;
    return parseFloat(result.toFixed(2));
  }
}