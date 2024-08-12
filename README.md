
# Personal Backend Project Documentation

## Project Overview

This project is the backend API for a personal website, developed using Node.js, Express, and MySQL. The backend handles authentication, blog management, and contact form submissions. The project is containerized using Docker and is designed to run within an AWS environment, with the frontend accessing the backend via a private subnet.

## Installation

To set up the project locally, follow these steps:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/vincentDevin/personal-backend.git
   cd personal-backend
   ```

2. **Docker Setup:**
   Ensure you have Docker installed. Then, build and start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. **Environment Variables:**
   Set up the required environment variables in a `.env` file:
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `ACCESS_TOKEN_SECRET`
   - `CAPTCHA_SECRET`

4. **Access the API:**
   The API will be available at `http://localhost:3000` by default.

## Project Structure

The project structure is organized as follows:

```
├── src
│   ├── server.ts
│   ├── middleware/
│   │   └── authMiddleware.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── blogRoutes.ts
│   │   └── contactRoutes.ts
│   └── types/
│       └── express.d.ts
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Running the API

Once the services are running via Docker Compose, you can access the API at `http://localhost:3000`. The API includes the following main routes:

- **Authentication:** `/api/auth`
- **Blog:** `/api`
- **Contact:** `/api`

### Database

The MySQL database is managed using a Docker container, with the schema defined in the project. Use phpMyAdmin at `http://localhost:8080` to manage the database directly.

### Customization

#### Middleware

Custom middleware is used for authentication, located in the `middleware/` directory. Modify the `authMiddleware.ts` file to customize authentication logic.

#### Routes

The API routes are defined in the `routes/` directory. You can add or modify routes by updating the files in this directory.

## Contributing

If you wish to contribute to this project, feel free to fork the repository and submit a pull request. Contributions are welcome!

## License

This project is licensed under the MIT License. See the `LICENSE` file for more information.
