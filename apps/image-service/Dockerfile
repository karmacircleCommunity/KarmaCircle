# Build stage: compile one static binary.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/image-service ./cmd/image-service

# Run stage: nothing but the binary, as a non-root user.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/image-service /image-service
EXPOSE 8080
ENTRYPOINT ["/image-service"]
