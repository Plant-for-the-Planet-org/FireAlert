# FireAlert 

The FireAlert app alerts you when heat anomalies are detected by NASA’s FIRMS in your forest. The project consists of a web application built with Next.js and a mobile application built with React Native. It is organized as a Yarn workspace, with the web app located in the `apps/server` directory and the mobile app in the `apps/nativeapp` directory.

## Features

- Receive alerts when heat anomalies are detected in your forest.
- Extendable to support different Alert Providers and Methods.
- Mobile applications for easy access.
- Auto sync your project sites from Plant-for-the-Planet Platform
- Single Sign On with Plant-for-the-Planet Account
- Support for SMS, EMAIL, WHATSAPP, WEBHOOK, and PUSH for notifications.

## Setup

### Prerequisites

Before setting up the project, make sure you have the following installed:

- Node.js 18 or higher
- Yarn package manager
- PostgreSQL (for Prisma database)

### 1. Clone the repository

Clone the project repository to your local machine using the following command:

```shell
git clone https://github.com/Plant-for-the-Planet-org/FireAlert
```

### 2. Install dependencies
Navigate to the project's root directory and install the dependencies:

```shell
cd FireAlert
yarn install
```
### 3. Set up Prisma
The project uses Prisma as the ORM (Object-Relational Mapping) tool. Prisma requires access to the database connection details via environment variables. Create a .env file in the project's root directory and populate it with the following information:

Please make sure DATABASE_URL_NON_POOLING variable uses a port that does not pool db transactions for Prisma Migrations.

```shell
DATABASE_URL=postgresql://username:password@localhost:5432/database
DATABASE_URL_NON_POOLING=postgresql://username:password@localhost:5432/database
```
Replace username, password, and database with your PostgreSQL database credentials.

### 4. Run database migrations
To create the initial database schema, run the following command:

```shell
yarn server db:deploy
```

To reset a database, run the following command:
```shell
yarn server db:reset
```

### 5. Populate the database (optional) [Not yet implemented]
If you want to populate the database with initial data, run the following command:
```shell
yarn server db:seed
```

### 6. Start the development servers
To start the development servers for both the web and mobile apps, follow these steps:

1. To start the Next.js server, run the following command:

```shell
yarn server dev
```
The web app will be accessible at http://localhost:3000.

2. To start the React Native development server, run the following command:

```shell
yarn nativeapp start
```
The mobile app can be accessed using an iOS or Android emulator.


### Deployment
To deploy the applications, follow the specific deployment guides for Next.js and React Native. Ensure that you update any necessary configuration files or environment variables for production deployments.

### Contributing
We welcome contributions to the FireAlert project. If you find a bug, have a feature request, or want to submit a pull request, please refer to our contribution guidelines.