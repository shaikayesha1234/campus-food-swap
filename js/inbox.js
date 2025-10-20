// ===== INBOX/REQUESTS & NOTIFICATIONS =====

let swapSubscription = null;
let messageSubscription = null;
let unreadCount = 0;

// Initialize real-time listeners on app load
async function initializeInboxListeners() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to new swaps where user is owner
    swapSubscription = supabase
        .channel('swaps_' + user.id)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'swaps',
            filter: `owner_id=eq.${user.id}`
        }, (payload) => {
            console.log('New swap request:', payload);
            showNotification('New food request!', 'Someone wants your food!');
            loadInboxRequests();
        })
        .subscribe();

    // Load initial data
    loadInboxRequests();
}

// Show browser/toast notification
function showNotification(title, body) {
    // Toast notification
    showToast(title + ' ' + body, 'success');
    
    // Browser notification (optional)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '🍔' });
    }
}

// Update unread count
async function updateUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try{
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('read', false)
            .neq('sender_id', user.id);

        if (!error && count !==null) {
            unreadCount = count;
            const badge = document.getElementById('inbox-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('updateUnreadCount error:', error);
    }
}

// Load all inbox requests for current user (owner)
async function loadInboxRequests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        // Received requests (owner ko)
        const { data: receivedSwaps, error: receivedError } = await supabase
            .from('swaps')
            .select(`
                id,
                status,
                created_at,
                food_id,
                requester_id,
                owner_id,
                foods!swaps_food_id_fkey (
                    id,
                    food_name,
                    image_url,
                    category
                ),
                requester:users!swaps_requester_id_fkey (
                    id,
                    username,
                    name,
                    rating,
                    hostel,
                    room_number
                )
            `)
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (receivedError) {
            console.error('Error loading received swaps:', receivedError);
            return;
        }

        displayInboxRequests(receivedSwaps || []);

        // Sent requests (requester ne jo requests kiye)
        const { data: sentSwaps, error: sentError } = await supabase
            .from('swaps')
            .select(`
                id,
                status,
                created_at,
                food_id,
                requester_id,
                owner_id,
                foods!swaps_food_id_fkey (
                    id,
                    food_name,
                    image_url,
                    category
                ),
                owner:users!swaps_owner_id_fkey (
                    id,
                    username,
                    name,
                    rating,
                    hostel,
                    room_number
                )
            `)
            .eq('requester_id', user.id)
            .order('created_at', { ascending: false });

        if (sentError) {
            console.error('Error loading sent swaps:', sentError);
            return;
        }

        displayMyRequests(sentSwaps || []);
        updateUnreadCount();

    } catch (error) {
        console.error('loadInboxRequests error:', error);
    }
}

// Display inbox requests
function displayInboxRequests(swaps) {
    const container = document.getElementById('inbox-requests');
    if (!container) return;

    container.innerHTML = '';

    if (swaps.length === 0) {
        container.innerHTML = '<p class="no-requests">No requests yet. Be patient!</p>';
        return;
    }

    swaps.forEach(swap => {
        const card = createSwapRequestCard(swap);
        container.innerHTML += card;
    });
}

// Create swap request card
function createSwapRequestCard(swap) {
    const statusClass = `status-${swap.status}`;
    const statusText = swap.status.charAt(0).toUpperCase() + swap.status.slice(1);
    
    return `
        <div class="swap-request-card" data-swap-id="${swap.id}">
            <div class="swap-header">
                <div class="swap-food-info">
                    <img src="${swap.foods?.image_url || 'images/placeholder.jpg'}" alt="${swap.foods?.food_name}" class="swap-food-img">
                    <div>
                        <h4>${swap.foods?.food_name || 'Unknown Food'}</h4>
                        <p class="swap-category">${swap.foods?.category}</p>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="requester-info">
                <p><i class="fas fa-user"></i> <strong>@${swap.requester?.username}</strong> (${swap.requester?.name})</p>
                <p><i class="fas fa-building"></i> ${swap.requester?.hostel}, Room ${swap.requester?.room_number}</p>
                <p><i class="fas fa-star"></i> Rating: ${swap.requester?.rating?.toFixed(1) || 'N/A'}</p>
            </div>

            <div class="swap-actions">
                <button onclick="openSwapChat('${swap.id}')" class="btn-chat">
                    <i class="fas fa-comments"></i> View Messages
                </button>
                ${swap.status === 'pending' ? `
                    <button onclick="updateSwapStatus('${swap.id}', 'accepted')" class="btn-accept">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button onclick="updateSwapStatus('${swap.id}', 'declined')" class="btn-reject">
                        <i class="fas fa-times"></i> Decline
                    </button>
                ` : ''}
            </div>

            <div class="swap-date">
                <small>Requested: ${new Date(swap.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `;
}

// Update swap status
async function updateSwapStatus(swapId, newStatus) {
    try {
        const { error } = await supabase
            .from('swaps')
            .update({ status: newStatus })
            .eq('id', swapId);

        if (error) throw error;

        showToast(`Request ${newStatus}!`, 'success');
        loadInboxRequests();

    } catch (error) {
        console.error('updateSwapStatus error:', error);
        showToast('Error updating status', 'error');
    }
}

// Open chat for specific swap
async function openSwapChat(swapId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data: swap, error: swapError } = await supabase
            .from('swaps')
            .select('*')
            .eq('id', swapId)
            .maybeSingle();

        if (swapError || !swap) {
            alert('Swap not found');
            return;
        }

        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('swap_id', swapId)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error('Error loading messages:', msgError);
            return;
        }

        // Mark messages as read
        await supabase
            .from('messages')
            .update({ read: true })
            .eq('swap_id', swapId)
            .neq('sender_id', user.id);

        displayChatModal(swap, messages || [], user.id);
        // Update unread count
        await updateUnreadCount();

    } catch (error) {
        console.error('openSwapChat error:', error);
    }
}

// Display chat modal
function displayChatModal(swap, messages, currentUserId) {
    const modal = document.getElementById('chat-modal');
    if (!modal) return;

    const chatContent = document.getElementById('chat-messages');
    if (!chatContent) return;

    chatContent.innerHTML = '';

    messages.forEach(msg => {
        const isCurrentUser = msg.sender_id === currentUserId;
        const msgClass = isCurrentUser ? 'msg-sent' : 'msg-received';
        
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${msgClass}`;
        msgEl.innerHTML = `
            <p>${msg.message}</p>
            <small>${new Date(msg.created_at).toLocaleTimeString()}</small>
        `;
        
        chatContent.appendChild(msgEl);
    });

    setTimeout(() => {
        chatContent.scrollTop = chatContent.scrollHeight;
    }, 100);

    modal.dataset.swapId = swap.id;
    modal.style.display = 'flex';
}
// function displayChatModal(swap, messages, currentUserId) {
//     const modal = document.getElementById('chat-modal');
//     if (!modal) {
//         console.error('Chat modal not found in HTML');
//         return;
//     }

//     const chatContent = document.getElementById('chat-messages');
//     if (!chatContent) {
//         console.error('Chat messages container not found');
//         return;
//     }

//     chatContent.innerHTML = '';

//     messages.forEach(msg => {
//         const isCurrentUser = msg.sender_id === currentUserId;
//         const msgClass = isCurrentUser ? 'msg-sent' : 'msg-received';
        
//         //console.log('Message:', msg.message, 'Sender:', msg.sender_id, 'Current:', currentUserId, 'Class:', msgClass);
        
//         const msgEl = document.createElement('div');
//         msgEl.className = `chat-message ${msgClass}`;
        
//         if (isCurrentUser) {
//             msgEl.innerHTML = `
//                 <p style="color: white; margin: 0; word-wrap: break-word; line-height: 1.4;">${msg.message}</p>
//                 <small style="font-size: 11px; opacity: 0.9; margin-top: 4px; color: white;">${new Date(msg.created_at).toLocaleTimeString()}</small>
//             `;
//         } else {
//             msgEl.innerHTML = `
//                 <p style="color: #222; margin: 0; word-wrap: break-word; line-height: 1.4;">${msg.message}</p>
//                 <small style="font-size: 11px; opacity: 0.7; margin-top: 4px; color: #666;">${new Date(msg.created_at).toLocaleTimeString()}</small>
//             `;
//         }
        
//         chatContent.appendChild(msgEl);
//     });

//     setTimeout(() => {
//         chatContent.scrollTop = chatContent.scrollHeight;
//     }, 100);

//     modal.dataset.swapId = swap.id;
//     modal.style.display = 'flex';
// }

// Send message in chat
async function sendChatMessage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showToast('User not authenticated', 'error');
        return;
    }

    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const modal = document.getElementById('chat-modal');
    const swapId = modal?.dataset.swapId;

    //console.log('Sending message:', { swapId, sender_id: user.id, message });

    if (!message) {
        showToast('Message cannot be empty', 'error');
        return;
    }
    
    if (!swapId) {
        showToast('Swap ID not found', 'error');
        console.error('swapId missing:', modal?.dataset);
        return;
    }

    try {
        const messageData = {
            swap_id: swapId,
            sender_id: user.id,
            message: message,
            read: false
        };

        //console.log('Message data:', messageData);

        const { data, error } = await supabase
            .from('messages')
            .insert([messageData])
            .select();

        if (error) {
            console.error('Insert error:', error);
            showToast('Error: ' + error.message, 'error');
            return;
        }

        //console.log('Message sent successfully:', data);

        input.value = '';
        
        // Reload chat
        const { data: swap } = await supabase
            .from('swaps')
            .select('*')
            .eq('id', swapId)
            .maybeSingle();

        const { data: updatedMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('swap_id', swapId)
            .order('created_at', { ascending: true });

        if (swap && updatedMessages) {
            displayChatModal(swap, updatedMessages, user.id);
        }

    } catch (error) {
        console.error('sendChatMessage error:', error);
        showToast('Error sending message', 'error');
    }
}

// Close chat modal
function closeChat() {
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show inbox modal
function showInboxModal() {
    const modal = document.getElementById('inbox-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadInboxRequests();
    }
}

// Close inbox modal
function closeInboxModal() {
    const modal = document.getElementById('inbox-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize on page load
window.addEventListener('load', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        initializeInboxListeners();
        requestNotificationPermission();
    }
});

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Load requests made BY current user (requester)
async function loadMyRequests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data: swaps, error } = await supabase
            .from('swaps')
            .select(`
                id,
                status,
                created_at,
                food_id,
                requester_id,
                owner_id,
                foods!swaps_food_id_fkey (
                    id,
                    food_name,
                    image_url,
                    category
                ),
                owner:users!swaps_owner_id_fkey (
                    id,
                    username,
                    name,
                    rating,
                    hostel,
                    room_number
                )
            `)
            .eq('requester_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading my requests:', error);
            return;
        }

        displayMyRequests(swaps || []);

    } catch (error) {
        console.error('loadMyRequests error:', error);
    }
}

// Display requests made BY user
function displayMyRequests(swaps) {
    const container = document.getElementById('my-requests');
    if (!container) return;

    container.innerHTML = '';

    if (swaps.length === 0) {
        container.innerHTML = '<p class="no-requests">No requests made yet.</p>';
        return;
    }

    swaps.forEach(swap => {
        const card = createMyRequestCard(swap);
        container.innerHTML += card;
    });
}

// Create card for requests MADE by user
function createMyRequestCard(swap) {
    const statusClass = `status-${swap.status}`;
    const statusText = swap.status.charAt(0).toUpperCase() + swap.status.slice(1);
    
    return `
        <div class="swap-request-card" data-swap-id="${swap.id}">
            <div class="swap-header">
                <div class="swap-food-info">
                    <img src="${swap.foods?.image_url || 'images/placeholder.jpg'}" alt="${swap.foods?.food_name}" class="swap-food-img">
                    <div>
                        <h4>${swap.foods?.food_name || 'Unknown Food'}</h4>
                        <p class="swap-category">${swap.foods?.category}</p>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="requester-info">
                <p><i class="fas fa-user"></i> <strong>@${swap.owner?.username}</strong> (${swap.owner?.name})</p>
                <p><i class="fas fa-building"></i> ${swap.owner?.hostel}, Room ${swap.owner?.room_number}</p>
                <p><i class="fas fa-star"></i> Rating: ${swap.owner?.rating?.toFixed(1) || 'N/A'}</p>
            </div>

            <div class="swap-actions">
                <button onclick="openSwapChat('${swap.id}')" class="btn-chat">
                    <i class="fas fa-comments"></i> View Messages
                </button>
            </div>

            <div class="swap-date">
                <small>Requested: ${new Date(swap.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `;
}

function switchTab(tab) {
    const received = document.getElementById('inbox-requests');
    const sent = document.getElementById('my-requests');
    const btnReceived = document.getElementById('tab-received');
    const btnSent = document.getElementById('tab-sent');

    if (tab === 'received') {
        received.style.display = 'block';
        sent.style.display = 'none';
        btnReceived.style.borderBottomColor = '#FF6B35';
        btnReceived.style.color = '#FF6B35';
        btnSent.style.borderBottomColor = 'transparent';
        btnSent.style.color = '#999';
    } else {
        received.style.display = 'none';
        sent.style.display = 'block';
        btnReceived.style.borderBottomColor = 'transparent';
        btnReceived.style.color = '#999';
        btnSent.style.borderBottomColor = '#FF6B35';
        btnSent.style.color = '#FF6B35';
    }
}