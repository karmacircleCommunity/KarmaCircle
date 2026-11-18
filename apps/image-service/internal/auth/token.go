// Package auth checks the short-lived upload tokens issued by the API.
//
// The API is the only thing that knows who is signed in. It signs a token
// that says "this person may upload one event cover for the next few
// minutes", and the browser sends it here with the file. This service never
// sees a session cookie and needs no database.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// Issuer and Audience must match what the API signs.
	Issuer   = "karmacircle-api"
	Audience = "image-service"

	// PurposeEventCover is the only thing a token can currently be used for.
	PurposeEventCover = "event-cover"

	// MaxTokenAge stops a token that was issued with a far-future expiry from
	// being accepted. The API issues five minutes.
	MaxTokenAge = 15 * time.Minute
)

// ErrInvalidToken covers every reason a token is refused. The reason is kept
// out of the message that reaches the caller.
var ErrInvalidToken = errors.New("invalid upload token")

// Claims is what the API puts in the token.
type Claims struct {
	Purpose string `json:"purpose"`
	jwt.RegisteredClaims
}

// Verifier checks tokens with a shared secret.
type Verifier struct {
	secret []byte
	now    func() time.Time
}

// NewVerifier returns a Verifier for the shared secret.
func NewVerifier(secret string) *Verifier {
	return &Verifier{secret: []byte(secret), now: time.Now}
}

// Verify returns the claims of a valid token, or an error wrapping
// ErrInvalidToken that says why, for the log.
func (v *Verifier) Verify(raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims,
		func(*jwt.Token) (any, error) { return v.secret, nil },
		// Only HS256. Pinning the method closes the "alg: none" and
		// RS256-as-HMAC downgrade tricks.
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(Issuer),
		jwt.WithAudience(Audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithTimeFunc(v.now),
		jwt.WithLeeway(5*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	if claims.Purpose != PurposeEventCover {
		return nil, fmt.Errorf("%w: wrong purpose %q", ErrInvalidToken, claims.Purpose)
	}
	if claims.Subject == "" {
		return nil, fmt.Errorf("%w: no subject", ErrInvalidToken)
	}
	if claims.IssuedAt == nil || claims.ExpiresAt == nil ||
		claims.ExpiresAt.Sub(claims.IssuedAt.Time) > MaxTokenAge {
		return nil, fmt.Errorf("%w: lifetime too long or missing", ErrInvalidToken)
	}
	return claims, nil
}
