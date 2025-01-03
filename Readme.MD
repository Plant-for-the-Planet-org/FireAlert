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


### System Architecture
The FireAlert application, a comprehensive geolocation-based alert system, ingests and processes GeoEvents before notifying users who have subscriptions to the impacted locations. GeoEvents encapsulate diverse environmental anomalies, ranging from heat deviations and flood occurrences to hurricanes and other meteorological extremes.

The application supports both push and pull mechanisms for various alert types, facilitated by modules known as GeoEvent Providers. Engineered with extensibility as a core attribute, FireAlert has the potential to integrate with a multitude of GeoEvent Providers. At the moment, it interfaces with FIRMS and MODIS GeoEvent Providers.

Each GeoEvent Provider is implemented as a distinct class under the apps/server/src/Services/GeoEventProvider directory, extending the abstract base GeoEventProvider class. This superclass provides a blueprint for two primary methods:

getGeoEvents: Scheduled via a cron job, this method fetches GeoEvents from the assigned provider, influenced by variables such as fetch frequency and the timestamp of the last retrieval.

Upcoming feature: An API route is in the pipeline to support "push" based GeoEvent Providers, allowing them to directly transmit events to the FireAlert system.

Post-fetching, GeoEvents undergo a transformation to the PostGIS Geometry format. Subsequently, an intersection operation is performed against each user's "sites" using the detectionGeometry attribute. If an intersection is detected, it triggers a 'SiteAlert'.

The lifecycle of a SiteAlert involves processing by a predefined "AlertMethod", encapsulated in the user's "alertMethod" attribute. Each SiteAlert consequently transpires into a dedicated notification.

To facilitate the inclusion of new AlertMethods, the system allows developers to extend the Notifier Services, located in the apps/server/src/Services/Notifier directory. Every Notifier Service constitutes a class that extends the Notifier superclass. At present, the Notifier superclass delineates several methods including 'device', 'email', 'sms', 'webhook', and 'push'.

### Deployment
To deploy the applications, follow the specific deployment guides for Next.js and React Native. Ensure that you update any necessary configuration files or environment variables for production deployments.

### Contributing
We welcome contributions to the FireAlert project. If you find a bug, have a feature request, or want to submit a pull request, please refer to our contribution guidelines.

