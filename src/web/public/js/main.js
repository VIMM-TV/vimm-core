document.addEventListener('DOMContentLoaded', function() {
    const generateKeyBtn = document.getElementById('generateKey');
    const usernameInput = document.getElementById('username');
    const streamKeyDisplay = document.querySelector('.stream-key-display');
    const streamKeyInput = document.getElementById('streamKey');
    const copyKeyBtn = document.getElementById('copyKey');

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

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate stream key: ' + error.message);
        }
    });

    copyKeyBtn.addEventListener('click', () => {
        streamKeyInput.select();
        document.execCommand('copy');
        alert('Stream key copied to clipboard!');
    });
});
