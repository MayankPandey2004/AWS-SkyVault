# Stage 1: Builder
FROM golang:1.24 AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o main main.go

# Stage 2: Lambda runtime
FROM public.ecr.aws/lambda/go:1

# Copy the binary into the Lambda task root
COPY --from=builder /app/main ${LAMBDA_TASK_ROOT}

# Command to run the Lambda function
CMD [ "main" ]
