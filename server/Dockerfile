# -------------------
# 1. Build Stage
# -------------------
FROM golang:1.22-alpine AS builder

# Install required packages
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go.mod and go.sum first (for better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire source code
COPY . .

# Build the Go binary
RUN go build -o main .

# -------------------
# 2. Runtime Stage
# -------------------
FROM alpine:latest

# Install certificates for HTTPS requests
RUN apk add --no-cache ca-certificates

WORKDIR /root/

# Copy compiled binary from builder
COPY --from=builder /app/main .

# Copy .env if you want inside container (optional, can also use AWS secrets/vars)
# COPY .env . 

# Expose backend port
EXPOSE 4000

# Run the app
CMD ["./main"]

