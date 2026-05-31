# 🎓 Future Institute of Commerce

A modern, full-featured **Angular 21** web application for managing a commerce coaching institute. Built with **Supabase** backend, featuring separate portals for students and administrators.

---

## ✨ Features

### 🏠 Public Pages
- **Homepage** - Hero section, courses, faculty, testimonials, contact form
- **About** - Institute vision, mission, and specialties
- **Courses** - Accountancy, Economics, Business Studies, Mathematics
- **Faculty** - Teacher profiles and qualifications
- **Testimonials** - Student success stories
- **Timeline** - Institute achievements (2010-2025)

### 👨‍🎓 Student Portal
- **Dashboard** - Personal info, academic details, fee status
- **Profile Setup** - Complete student profile after registration
- **Fee Payment** - Secure payment form with receipt generation
- **Marks View** - View test scores and academic progress
- **Print Marksheet** - Download/print official report card

### 🔐 Admin Portal
- **Admin Login** - Separate secure login at `/admin-login`
- **Student Management** - View all students with search & filters
- **Add New Student** - Register students with full details
- **Management Hub** - Overlay modal to manage individual students:
  - Edit profile (name, father name, phone, class, course)
  - Toggle profile completion status
  - Delete student accounts
  - **Test Marks CRUD** - Add, view, delete student grades
  - **Fee Payments CRUD** - Manage payment records

---

## �️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Angular 21.2 |
| **Language** | TypeScript 5.9 |
| **Styling** | Bootstrap 5.3, Custom CSS |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Fonts** | Inter (body), Poppins (headings) |
| **Icons** | Font Awesome 6.5 |
| **Animations** | Animate.css |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── admin/              # Admin dashboard & student management
│   │   ├── admin-add-student/  # Add new student form
│   │   ├── admin-login/        # Admin login portal
│   │   ├── dashboard/          # Student dashboard
│   │   ├── login/              # Student login
│   │   ├── register/           # Student registration
│   │   ├── profile-setup/      # Complete profile
│   │   ├── payment/            # Fee payment
│   │   ├── timeline/           # Achievements timeline
│   │   └── home/               # Homepage sections
│   ├── services/
│   │   └── supabase.service.ts # Database operations
│   ├── auth.guard.ts           # Student route protection
│   ├── admin.guard.ts         # Admin route protection
│   └── app.routes.ts          # Route definitions
├── environments/               # Supabase config
└── styles.css                 # Global styles
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/keshavladha/Education-Institution-site.git
cd Education-Institution-site
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Supabase
Update `src/environments/environment.ts` with your Supabase credentials:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key'
};
```

### 4. Run development server
```bash
ng serve
```

Navigate to `http://localhost:4200/`

### 5. Build for production
```bash
ng build
```

---

## 🔑 Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@futureinstitute.edu` |
| Password | `adminpassword123` |

Or register a new admin at `/admin-login` with email `admin@futureinstitute.edu` or `principal@futureinstitute.edu`

---

## 🎨 Design System

- **Primary Color**: `#485CD7` (Royal Blue)
- **Secondary**: `#1A1F3A` (Dark Navy)
- **Background**: `#F8F9FC` (Light Gray)
- **Body Font**: Inter
- **Heading Font**: Poppins
- **Border Radius**: 8px-24px
- **Shadow**: Glassmorphism effects

---

## 👨‍💻 Author

**Keshav Ladha**

---

## 📝 License

This project is for educational purposes.
