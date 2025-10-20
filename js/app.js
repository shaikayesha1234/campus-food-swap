// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Campus Food Swap loaded!');
});

// Real-time subscription for new foods
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

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('add-food-modal');
    if (event.target == modal) {
        closeAddFoodModal();
    }
}