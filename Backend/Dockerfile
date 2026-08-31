# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install system dependencies including curl for Node.js
RUN apt-get update && apt-get install -y curl

# Install Node.js (v20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Set the working directory
WORKDIR /app

# Copy the backend files into the container
COPY . /app

# Install Node dependencies
RUN npm install

# Install Python dependencies natively for the ingestion ML pipeline
RUN pip3 install --no-cache-dir python-dotenv google-generativeai pypdf pytextrank spacy networkx sentence-transformers scikit-learn
# Pre-download the spaCy language model
RUN python3 -m spacy download en_core_web_sm

# Expose backend port
EXPOSE 3002

# Run the backend
CMD ["npm", "start"]
