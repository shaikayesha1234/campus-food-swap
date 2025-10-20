# 🍔 Campus Food Swap

A hostel food sharing and swapping platform where students can share, request, and trade food items with their peers on campus.

## ✨ Features

### Authentication
- User signup with email verification via OTP
- Login with email or username
- Password reset functionality
- Secure session management with Supabase Auth

### Food Listings
- Post food items with images, descriptions, and prices
- Set food availability and pickup locations
- Categorize food (Snacks, Meals, Drinks, Desserts)
- Search and filter food listings
- View seller information and ratings

### Request & Chat System
- Request food from other students
- Real-time chat with food owners/requesters
- Separate tabs for received and sent requests
- Accept/decline food requests
- Message read status tracking

### Notifications
- Unread message counter badge
- Real-time request notifications
- Toast notifications for actions

### User Profile
- Edit profile information
- Change password
- Notification preferences
- View user ratings and points
- Hostel and room information

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (for images)
- **Email:** EmailJS
- **Real-time:** Supabase Realtime

## 📁 Project Structure

```
campus-food-swap/
├── index.html              # Main HTML file
├── css/
│   ├── style.css          # Main styling
│   └── style1.css         # Notification styling
├── js/
│   ├── supabase-config.js # Supabase configuration
│   ├── auth.js            # Authentication logic
│   ├── food-listings.js   # Food listing management
│   ├── inbox.js           # Inbox & chat system
│   └── app.js             # Main app logic
└── images/
    └── (food images)

```

## 🚀 Getting Started

### Prerequisites
- Supabase account
- EmailJS account
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-food-swap
   ```

2. **Configure Supabase**
   - Create a project on Supabase
   - Get your project URL and API key
   - Update `js/supabase-config.js`:
   ```javascript
   const SUPABASE_URL = 'your-supabase-url';
   const SUPABASE_KEY = 'your-supabase-key';
   ```

3. **Configure EmailJS**
   - Sign up on EmailJS
   - Get your Service ID, Template ID, and Public Key
   - Update `js/auth.js`:
   ```javascript
   emailjs.init("YOUR_PUBLIC_KEY");
   ```

4. **Setup Database**
   - Run the SQL migrations in Supabase
   - Create tables: users, foods, swaps, messages, email_verification_codes, password_reset_otps

5. **Run locally**
   ```bash
   python -m http.server 8000
   # or use any local server
   ```

## 📊 Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- username (String, Unique)
- email (String, Unique)
- name (String)
- hostel (String)
- room_number (String)
- phone (String)
- rating (Float, default 5.0)
- points (Integer, default 0)
- notif_email (Boolean)
- notif_app (Boolean)
- notif_promo (Boolean)
- created_at (Timestamp)
```

### Foods Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- food_name (String)
- description (String)
- category (String)
- quantity (String)
- price (Float, nullable)
- swap_for (Array)
- image_url (String)
- pickup_location (String)
- available_until (Timestamp)
- status (String, default 'available')
- created_at (Timestamp)
```

### Swaps Table
```sql
- id (UUID, Primary Key)
- food_id (UUID, Foreign Key)
- requester_id (UUID, Foreign Key)
- owner_id (UUID, Foreign Key)
- offer_food_id (UUID, nullable)
- status (String, default 'pending')
- created_at (Timestamp)
- updated_at (Timestamp)
```

### Messages Table
```sql
- id (UUID, Primary Key)
- swap_id (UUID, Foreign Key)
- sender_id (UUID, Foreign Key)
- message (String)
- read (Boolean, default false)
- created_at (Timestamp)
```

## 🔐 Security Features

- Email verification for signup
- Password hashing with Supabase Auth
- OTP-based password reset
- Row Level Security (RLS) policies
- Input sanitization
- Rate limiting on OTP requests

## 🎨 UI/UX

- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Toast notifications for user feedback
- Modal dialogs for actions
- Orange and green color scheme
- FontAwesome icons

## 📱 Features Breakdown

### Authentication
- Signup with verification
- Email/username login
- Forgot password with OTP
- Session management

### Food Management
- Add/Edit/Delete food posts
- Image upload
- Search functionality
- Category filtering
- Status tracking

### Request System
- Send food requests
- Accept/decline requests
- View request history
- Real-time notifications

### Chat System
- Send/receive messages
- Real-time updates
- Message read status
- Separate received/sent tabs

### User Management
- Edit profile
- Change password
- Notification preferences
- Rating system

## 🐛 Known Issues

- Notifications require browser permission
- Storage limited by Supabase plan

## 🚧 Future Enhancements

- Rating and review system
- Food expiry notifications
- Recurring food listings
- User badges/achievements
- Advanced search filters
- Food waste statistics
- Payment integration
- Mobile app version

## 📝 License

MIT License - Feel free to use for educational purposes

## 👥 Contributing

Contributions are welcome! Please fork the repository and submit pull requests.

## 📧 Support

For issues or questions, please contact: support@campusfoodswap.com

---

**Made with ❤️ for campus communities**