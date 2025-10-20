async function loadFoods() {
    try{
        const { data: foods, error } = await supabase
            .from('foods')
            .select(`
                *,
                users (
                    name,
                    username,
                    hostel,
                    room_number,
                    rating
                )
            `)
            .eq('status', 'available')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading foods:', error);
            return;
        }

        displayFoods(foods);
    } catch (error) {
        console.error('loadFoods exception:', error);
    }
}

async function displayFoods(foods) {
    const container = document.getElementById('food-listings');
    container.innerHTML = '';

    if (foods.length === 0) {
        container.innerHTML = '<p class="no-foods">No food available right now. Be the first to share!</p>';
        return;
    }


    foods.forEach(food => {
        const card = createFoodCard(food);
        container.innerHTML += card;
    });
}

function createFoodCard(food) {
    const price = food.price ? `₹${food.price}` : 'FREE';
    const swapFor = food.swap_for ? `or swap for: ${food.swap_for.join(', ')}` : '';
    
    return `
        <div class="food-card" data-food-id="${food.id}">
             <div class="food-menu">
                <button class="food-menu-btn" onclick="toggleFoodMenu('${food.id}')">
                    <span>⋮</span>
                </button>
                <div class="food-menu-dropdown" id="food-menu-${food.id}" style="display:none;">
                    <button onclick="editFood('${food.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="deleteFood('${food.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>

            <img src="${food.image_url || 'images/placeholder.jpg'}" alt="${food.food_name}">
            <div class="food-info">
                <h3>${food.food_name}</h3>
                <p class="quantity">${food.quantity || 'No quantity specified'}</p>
                <p class="description">${food.description || ''}</p>
                <span class="category-badge">${food.category}</span>
                <div class="user-info-card">
                    <p><i class="fas fa-user"></i> @${food.users.username} (${food.users.name})</p>
                    <p><i class="fas fa-building"></i> ${food.users.hostel}, Room ${food.users.room_number}</p>
                    <p><i class="fas fa-star"></i> ${food.users.rating.toFixed(1)}</p>
                </div>
                <div class="price-section">
                    <span class="price">${price}</span>
                    ${swapFor ? `<span class="swap">${swapFor}</span>` : ''}
                </div>
                <button onclick="requestSwap('${food.id}')" class="btn-request">Request</button>
            </div>
        </div>
    `;
}

async function addFood() {
    try{
        const { data: { user } } = await supabase.auth.getUser();
        
        const foodImage = document.getElementById('food-image').files[0];
        const foodName = document.getElementById('food-name').value;
        const quantity = document.getElementById('food-quantity').value;
        const description = document.getElementById('food-description').value;
        const category = document.getElementById('food-category').value;
        const price = document.getElementById('food-price').value || null;
        const swapFor = document.getElementById('swap-for').value;
        const pickupLocation = document.getElementById('pickup-location').value;
        const availableUntil = document.getElementById('available-until').value;

        if (!foodName || !category) {
            alert('Please fill required fields');
            return;
        }

        let imageUrl = null;

        if (foodImage) {
            const fileName = `${Date.now()}_${foodImage.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('food-images')
                .upload(fileName, foodImage);

            if (uploadError) {
                alert('Error uploading image: ' + uploadError.message);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('food-images')
                .getPublicUrl(fileName);

            imageUrl = urlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('foods')
            .insert([{
                user_id: user.id,
                food_name: foodName,
                quantity: quantity,
                description: description,
                category: category,
                price: price,
                swap_for: swapFor ? swapFor.split(',').map(s => s.trim()) : null,
                image_url: imageUrl,
                pickup_location: pickupLocation,
                available_until: availableUntil || null
            }]);

        if (error) {
            showToast('Error adding food: ' + error.message, 'error');
            return;
        }

        showToast('Food posted successfully!', 'success');
        closeAddFoodModal();
        loadFoods();
    } catch (error) {
        console.error('addFood error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

function showAddFoodModal() {
    document.getElementById('add-food-modal').style.display = 'block';
}

function closeAddFoodModal() {
    document.getElementById('add-food-modal').style.display = 'none';
    document.getElementById('food-image').value = '';
    document.getElementById('food-name').value = '';
    document.getElementById('food-quantity').value = '';
    document.getElementById('food-description').value = '';
    document.getElementById('food-category').value = '';
    document.getElementById('food-price').value = '';
    document.getElementById('swap-for').value = '';
    document.getElementById('pickup-location').value = '';
    document.getElementById('available-until').value = '';
    document.getElementById('image-preview').style.display = 'none';
}

function previewImage() {
    const file = document.getElementById('food-image').files[0];
    const preview = document.getElementById('image-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

async function searchFoods() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const { data: foods, error } = await supabase
        .from('foods')
        .select(`*, users (name, username, hostel, room_number, rating)`)
        .eq('status', 'available')
        .or(`food_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error searching:', error);
        return;
    }

    displayFoods(foods);
}

async function filterByCategory() {
    const category = document.getElementById('category-filter').value;
    
    let query = supabase
        .from('foods')
        .select(`*, users (name, username, hostel, room_number, rating)`)
        .eq('status', 'available');

    if (category) {
        query = query.eq('category', category);
    }

    const { data: foods, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error filtering:', error);
        return;
    }

    displayFoods(foods);
}

async function requestSwap(foodId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: food } = await supabase
        .from('foods')
        .select('*, users(name)')
        .eq('id', foodId)
        .maybeSingle();

    if (food.user_id === user.id) {
        alert("You can't request your own food!");
        return;
    }

    const message = `Hi! I'm interested in your ${food.food_name}. Is it still available?`;
    
    const { data: swap, error } = await supabase
        .from('swaps')
        .insert([{
            food_id: foodId,
            requester_id: user.id,
            owner_id: food.user_id,
            status: 'pending'
        }])
        .select()
        .maybeSingle();

    if (error) {
        alert('Error creating request: ' + error.message);
        return;
    }

    await supabase
        .from('messages')
        .insert([{
            swap_id: swap.id,
            sender_id: user.id,
            message: message
        }]);

    alert(`Request sent to ${food.users.name}!`);
}

async function sendHungerSOS() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const message = prompt('Describe what you need (optional):');
    
    alert('Hunger SOS broadcasted to nearby students!');
}

// Toast notification function
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animation - appear
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

let foodIdToDelete = null;
function showDeleteConfirmation(foodId) {
    foodIdToDelete = foodId;  // ← Value store hoti hai yaha
    document.getElementById('delete-confirmation-modal').style.display = 'flex';
}

// Close delete confirmation modal
function closeDeleteConfirmation() {
    document.getElementById('delete-confirmation-modal').style.display = 'none';
    foodIdToDelete = null;
}

// Confirm delete
async function confirmDelete() {
    if (!foodIdToDelete) return;

    const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', foodIdToDelete);

    if (error) {
        showToast("Failed to delete. Try again.", 'error');
        closeDeleteConfirmation();
        return;
    }

    // HTML se food card ko remove karo
    const foodCard = document.querySelector(`[data-food-id="${foodIdToDelete}"]`);
    if (foodCard) {
        foodCard.remove();
    }

    showToast('Food deleted successfully!', 'success');
    closeDeleteConfirmation();
}

// Update deleteFood function - call modal instead of alert
function deleteFood(foodId) {
    showDeleteConfirmation(foodId);
}

function editFood(foodId) {
    // Fetch food data from Supabase (or from your JS array if already loaded)
    supabase
        .from('foods')
        .select('*')
        .eq('id', foodId)
        .maybeSingle()
        .then(({ data, error }) => {
            if (error || !data) {
                alert("Could not load food post.");
                return;
            }
            document.getElementById('edit-food-id').value = data.id;
            document.getElementById('edit-food-title').value = data.food_name;
            document.getElementById('edit-food-desc').value = data.description;
            document.getElementById('edit-food-category').value = data.category;
            if (document.getElementById('edit-food-quantity')) {
                document.getElementById('edit-food-quantity').value = data.quantity || '';
            }
            if (document.getElementById('edit-food-price')) {
                document.getElementById('edit-food-price').value = data.price || '';
            }
            document.getElementById('edit-food-modal').style.display = 'flex';
        });
}

function closeEditFoodModal() {
    document.getElementById('edit-food-modal').style.display = 'none';
}


async function saveFoodEdit() {
    const id = document.getElementById('edit-food-id').value;
    const food_name = document.getElementById('edit-food-title').value.trim();
    const description = document.getElementById('edit-food-desc').value.trim();
    const category = document.getElementById('edit-food-category').value;
    // Add these if your table has these columns:
    const quantity = document.getElementById('edit-food-quantity')?.value?.trim();
    const price = document.getElementById('edit-food-price')?.value || null;

    // Validation: category must be Snacks, Meals, Drinks, Desserts
    const allowedCategories = ['Snacks', 'Meals', 'Drinks', 'Desserts'];
    if (!allowedCategories.includes(category)) {
        showToast('Please select a valid category.', 'error');
        return;
    }

    // Build update object with all required fields
    const updateObj = {
        food_name,
        description,
        category,
        quantity,
        price
    };
    if (quantity !== undefined) updateObj.quantity = quantity;
    if (price !== undefined) updateObj.price = price;

    const { error } = await supabase
        .from('foods')
        .update(updateObj)
        .eq('id', id);

    if (error) {
        showToast("Failed to update: " + error.message, 'error');
        return;
    }

    showToast("Food updated successfully!", 'success');
    closeEditFoodModal();
    // Optionally refresh food list or update UI
    loadFoods();
}


function toggleFoodMenu(foodId) {
    // Hide all other menus
    document.querySelectorAll('.food-menu-dropdown').forEach(menu => {
        menu.style.display = 'none';
    });
    // Toggle this menu
    const menu = document.getElementById('food-menu-' + foodId);
    if (menu) {
        menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
    }
}

// Optional: Hide menu when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.food-menu')) {
        document.querySelectorAll('.food-menu-dropdown').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});
