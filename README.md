# 📚 StudyFlow 2.0

### Your Smart Academic Productivity Companion

**StudyFlow 2.0** is a student-focused academic productivity web application designed to help students organize their studies, manage daily tasks, track examinations, monitor academic progress, and stay productive—all from one dashboard.

Developed with ❤️ by **R N Ayush**.

---

## 🚀 Features

### 📊 Smart Dashboard
- Overview of academic activities
- Total and completed task tracking
- Upcoming examination reminders
- Semester-wise progress monitoring

### 🎓 Semester & Subject Management
- Create and manage semesters
- Organize subjects by semester
- Track academic information in one place

### ✅ Task Management
- Add, complete, and manage academic tasks
- Monitor pending assignments
- Track completion progress

### 📅 Timetable & Examination Tracker
- Organize weekly class schedules
- Manage upcoming examinations
- Track examination countdowns

### 📈 Academic Analytics
- Visualize study progress
- Monitor task completion
- Review productivity statistics

### ⏱️ Focus Timer
- Pomodoro-style study timer
- Track focused study sessions
- Build consistent study habits

### 📝 Notes & Study Materials
- Create and manage study notes
- Upload and access academic documents
- Organize learning resources

### 🤖 Study Assistant
- Built-in rule-based study assistant
- Quick assistance with study organization and productivity

### 🔐 Google & Email Authentication
- Google account sign-in
- Email and password authentication
- Supabase-powered account management

### ☁️ Cloud Backup
- Manual academic data upload and restoration using Supabase
- Browser-based local data storage
- Cloud backup for supported academic records

### 🌙 Dark Mode
- Light and dark appearance options
- Clean, responsive user interface

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive design |
| JavaScript | Application functionality |
| Supabase | Authentication and cloud database |
| Google OAuth 2.0 | Google account login |
| LocalStorage | Browser-based academic data |
| IndexedDB | Local study material storage |
| GitHub Pages | Website hosting |

---

## 💻 Getting Started

1. Clone the repository:

   `git clone https://github.com/rnayush2007-cyber/StudyFlow.git`

2. Open the project directory.

3. Configure the Supabase Project URL and publishable API key in `cloud.js`.

4. Run the website using a local development server.

5. Open the local website in your browser and sign in.

Google OAuth requires the appropriate redirect URLs to be configured in Supabase and Google Cloud Console.

---

## 📁 Project Structure

```text
StudyFlow/
├── index.html
├── style.css
├── script.js
├── backup.js
├── cloud.js
├── account-storage.js
├── images/
│   ├── logo.png
│   └── dashboard-banner.png
└── README.md
```

---

## 🔒 Data & Privacy

StudyFlow uses Supabase authentication and database Row Level Security to protect cloud records.

Academic records can be backed up manually to the cloud. Uploaded study material files are currently stored locally and are not included in the cloud backup.

**Development status:** Account-specific browser storage and cross-device data restoration require further testing before production use.

---

## 🔮 Future Enhancements

- Automatic cloud synchronization
- Cross-device access to uploaded study materials
- Improved account-based data isolation
- Enhanced academic analytics
- Notifications and examination reminders
- Smarter AI-powered study assistance
- Progressive Web App (PWA) support

---

## 👨‍💻 Developer

**R N Ayush**

B.Tech Biotechnology Student

GitHub: [@rnayush2007-cyber](https://github.com/rnayush2007-cyber)

---

## 📌 Project Status

**StudyFlow 2.0 — Beta Version**

The application is under active development. Core academic features, Google authentication, and manual cloud backups have been implemented, with additional testing and improvements ongoing.

---

⭐ If you find StudyFlow useful, consider starring the repository!

**Made with 💜 for students, by a student.**
