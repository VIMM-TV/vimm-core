document.addEventListener('DOMContentLoaded', function() {
    const generateKeyBtn = document.getElementById('generateKey');
    const usernameInput = document.getElementById('username');
    const streamKeyDisplay = document.querySelector('.stream-key-display');
    const streamKeyInput = document.getElementById('streamKey');
    const copyKeyBtn = document.getElementById('copyKey');
    const postingAuthDisplay = document.querySelector('.posting-auth');
    const grantAuthBtn = document.getElementById('grantAuth');
    const POSTER_ACCOUNT = 'vimm';

    async function checkPostingAuth(username) {
        try {
            const response = await fetch('https://api.openhive.network', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "condenser_api.get_accounts",
                    params: [[username]],
                    id: 1
                })
            });
            const data = await response.json();
            
            if (data.result && data.result[0]) {
                const posting = data.result[0].posting;
                return posting.account_auths.some(auth => auth[0] === POSTER_ACCOUNT);
            }
            return false;
        } catch (error) {
            console.error('Error checking posting auth:', error);
            return false;
        }
    }

    // Function to initialize Hive Keychain integration
    function initHiveKeychain() {
        if (window.hive_keychain) {
            console.log('Hive Keychain found');
            generateKeyBtn.disabled = false;
            generateKeyBtn.textContent = 'Generate Stream Key';
            
            // Try to get the username from Hive Keychain
            window.hive_keychain.requestHandshake(() => {
                console.log('Hive Keychain handshake successful');
            });
        } else {
            console.log('Hive Keychain not found, retrying in 500ms...');
            setTimeout(initHiveKeychain, 500);
        }
    }

    // Add message to show loading state
    generateKeyBtn.textContent = 'Checking for Hive Keychain...';

    // Start checking for Hive Keychain
    initHiveKeychain();

    generateKeyBtn.addEventListener('click', async () => {
        if (!window.hive_keychain) {
            alert('Hive Keychain is required but not found. Please install it and refresh the page.');
            return;
        }

        try {
            // Request account name from Hive Keychain
            const username = await new Promise((resolve, reject) => {
                window.hive_keychain.requestSignBuffer(
                    usernameInput.value,  // Use the value of the input usernameInput
                    'Sign to verify your Hive account ownership',
                    'Posting',
                    response => {
                        if (response.success) {
                            resolve(response.data.username);
                        } else {
                            reject(new Error(response.message));
                        }
                    }
                );
            });

            // Update UI with username
            usernameInput.textContent = username;

            // Request stream key from server
            const response = await fetch('/api/auth/stream-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                throw new Error('Failed to generate stream key');
            }

            const data = await response.json();
            
            // Display the stream key
            streamKeyInput.value = data.streamKey;
            streamKeyDisplay.style.display = 'block';
            generateKeyBtn.textContent = 'Generate New Stream Key';
            
            // After successful key generation, show the posting auth section
            postingAuthDisplay.style.display = 'block';
            
            // Check if posting auth is already granted
            const hasAuth = await checkPostingAuth(username);
            if (hasAuth) {
                grantAuthBtn.textContent = 'Posting Authority Already Granted';
                grantAuthBtn.disabled = true;
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate stream key: ' + error.message);
        }
    });

    grantAuthBtn.addEventListener('click', async () => {
        if (!window.hive_keychain) {
            alert('Hive Keychain is required but not found. Please install it and refresh the page.');
            return;
        }

        const username = usernameInput.value;
        
        // First, get current authorities to preserve them
        try {
            const response = await fetch('https://api.openhive.network', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "condenser_api.get_accounts",
                    params: [[username]],
                    id: 1
                })
            });
            const data = await response.json();
            const posting = data.result[0].posting;
            
            // Prepare the authority update
            window.hive_keychain.requestUpdateAuth(
                username,
                'posting',
                {
                    account_auths: [...posting.account_auths, [POSTER_ACCOUNT, posting.weight_threshold]],
                    key_auths: posting.key_auths,
                    weight_threshold: posting.weight_threshold
                },
                response => {
                    if (response.success) {
                        alert(`Successfully granted posting authority to @${POSTER_ACCOUNT}`);
                        grantAuthBtn.textContent = 'Posting Authority Granted';
                        grantAuthBtn.disabled = true;
                    } else {
                        alert('Failed to grant posting authority: ' + response.message);
                    }
                }
            );
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to update posting authority: ' + error.message);
        }
    });

    copyKeyBtn.addEventListener('click', () => {
        streamKeyInput.select();
        document.execCommand('copy');
        alert('Stream key copied to clipboard!');
    });
});
