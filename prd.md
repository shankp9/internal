**Product Requirements Document (PRD)**
**Project Title:** Resource Management System
**Version:** 1.0
**Prepared by:** Shashank
**Date:** November 2025

---

### 1. **Overview**

The Resource Management System (RMS) is a web-based platform designed to help organizations manage developer allocations efficiently across clients and projects. The system provides visibility into team utilization, available capacity, and workload distribution, enabling data-driven decisions for onboarding new clients or redistributing resources.

---

### 2. **Goals & Objectives**

* Centralize developer allocation and project tracking.
* Replace Excel-based manual planning.
* Provide role-based access and approval workflows.
* Enable real-time visibility into developer capacity and utilization.
* Support hierarchy of **Clients → Projects → Assignments** with developer utilization tracking.

---

### 3. **User Roles & Access Control (RBAC)**

| Role                     | Permissions                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**                | Full system access. Manage users, roles, clients, projects, approvals, and reports.                                                              |
| **Manager**              | Manage developers under their supervision. Create/edit assignments and send for approval. View dashboards for their team, clients, and projects. |
| **Employee (Developer)** | View own assignments, utilization, and pending tasks. Cannot edit or approve assignments.                                                        |

---

### 4. **System Hierarchy**

**Client → Project → Assignment → Developer**

* **Client:** Represents a business client the company serves.
* **Project:** Belongs to a client. Each project can have multiple assignments.
* **Assignment:** A unit of work within a project, linked to a developer and a utilization percentage.
* **Developer:** Employee resource under a manager.

---

### 5. **Key Features**

#### 5.1 Client Management

* Add/edit clients with relevant details (Name, Industry, Account Manager, etc.)
* View all projects and total resource utilization per client.

#### 5.2 Project Management

* Create projects under clients with details: Project Name, Start Date, End Date, Tags, and Manager.
* Assign multiple developers via assignments.
* Track overall project utilization and progress.

#### 5.3 Assignment Management

* Assign developers to specific tasks within a project.
* Set **utilization percentage (0–100%)**, **start date**, and **end date**.
* Tag assignments by type (e.g., Frontend, Backend, QA, DevOps).
* Manager must **submit assignments for approval**.
* Admin/Approver can **approve or reject** assignments.

#### 5.4 Developer Management

* View developer profiles (Skills, Role, Manager, Current Utilization, Available Capacity).
* Calculate **Available Capacity = 100% - Sum of Active Assignment Utilization.**
* Assign developers to new projects based on available capacity and skill match.

#### 5.5 Dashboards & Reports

* **By Manager:** View total utilization of their team, breakdown by project/client.
* **By Client:** Aggregate utilization for all projects under a client.
* **By Project:** See allocation of each developer, percentage of capacity used.
* **Company Overview Dashboard:** View total resource utilization, available bench, upcoming capacity, and forecast for onboarding new clients.

#### 5.6 Approval Workflow

* Manager creates/edits assignments → sends for approval.
* Admin or Approving Manager validates allocation → approves or rejects.
* System logs all approvals with timestamps and comments for audit.

#### 5.7 Tags & Categorization

* Assign tags to projects and assignments (e.g., Frontend, Backend, Mobile, API).
* Filter dashboards and reports based on tags.

#### 5.8 Notifications

* Email or in-app alerts for assignment approvals, approaching end dates, and over-utilization (>100%).

---

### 6. **Data Model Overview**

**Entities:**

* Client (id, name, account_manager_id, start_date, industry)
* Project (id, client_id, name, manager_id, start_date, end_date, tags)
* Assignment (id, project_id, developer_id, utilization%, start_date, end_date, tags, status [pending/approved])
* Developer (id, name, manager_id, skills, total_utilization, available_capacity)
* User (id, name, role, email, password_hash)

---

### 7. **Capacity Calculation Logic**

* **Total Utilization** = Sum of all active assignment utilizations (based on date range).
* **Available Capacity** = 100% - Total Utilization.
* System should flag any developer with utilization >100%.

---

### 8. **Dashboards (UI/UX Requirements)**

#### 8.1 Manager Dashboard

* Team utilization chart (per developer).
* Upcoming availability forecast.
* Pending approvals section.

#### 8.2 Client Dashboard

* List of projects, their timelines, and assigned resources.
* Aggregate utilization metrics.

#### 8.3 Project Dashboard

* Gantt-style view of developer assignments with utilization bars.
* Tag-based filters and date range filters.

#### 8.4 Admin Dashboard

* Company-wide resource utilization heatmap.
* Overbooked developers.
* Available capacity summary.

---

### 9. **Reports & Analytics**

* Exportable reports (Excel, CSV, PDF) for:

  * Developer utilization by week/month.
  * Client-wise resource allocation.
  * Project cost forecasting (optional future module).

---

### 10. **Future Enhancements (Phase 2)**

* Integration with Timesheets & Payroll.
* Skill-based auto-matching for assignments.
* AI-driven capacity prediction.
* Integration with HRMS/ATS systems.

---

### 11. **Success Metrics**

* 100% replacement of manual Excel-based planning.
* 90% accuracy in real-time capacity tracking.
* <1 day delay in assignment approvals.
* Improved onboarding readiness visibility for new clients.

---

### 12. **Tech Stack (Tentative)**

* **Frontend:**  Next.js
* **Backend:** Node.js + Express
* **Database:** Mongodb
* **Authentication:** JWT-based RBAC
* **Visualization:** Recharts / D3.js for dashboards
* **Deployment:** Docker + CI/CD (Bitbucket / GitHub Actions)

---

### 13. **Conclusion**

The Resource Management System will streamline how teams, managers, and admins manage developer allocations across projects and clients, ensuring efficient utilization, reduced planning overhead, and better forecasting for new business capacity.
