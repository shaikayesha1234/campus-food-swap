// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Campus Food Swap loaded!');

    // Wait for Supabase to initialize then setup realtime
    setTimeout(() => {
        setupRealtimeSubscription();
    }, 1000);
});

// Real-time subscription for new foods
function setupRealtimeSubscription() {
    try {
        supabase
            .channel('foods-channel')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'foods' },
                (payload) => {
                    console.log('New food added!', payload.new);
                    loadFoods();
                }
            )
            .subscribe();
    } catch (error) {
        console.error('Realtime subscription error:', error);
    }
}
// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('add-food-modal');
    if (event.target == modal) {
        closeAddFoodModal();
    }
}