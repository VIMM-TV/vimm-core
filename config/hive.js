module.exports = {
  defaultTags: ['vimm', 'streaming', 'live', 'video', 'hive'],
  beneficiaries: [
      {
          account: 'vimm',  // Replace with your desired beneficiary account
          weight: 2000         // 20% (weight is in basis points, 100 = 1%)
      }
  ],
  // Don't put the actual posting key here! Set it in the environment variables.
  // Example: export HIVE_POSTING_KEY=yourpostingkeyhere
  postingKey: process.env.HIVE_POSTING_KEY
};