package auth

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "0123456789abcdef0123456789abcdef"

var fixedNow = time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)

func verifier() *Verifier {
	v := NewVerifier(secret)
	v.now = func() time.Time { return fixedNow }
	return v
}

type options struct {
	method   jwt.SigningMethod
	key      any
	issuer   string
	audience string
	purpose  string
	subject  string
	issued   time.Time
	expires  time.Time
}

func defaults() options {
	return options{
		method: jwt.SigningMethodHS256, key: []byte(secret),
		issuer: Issuer, audience: Audience, purpose: PurposeEventCover, subject: "user-1",
		issued: fixedNow.Add(-time.Minute), expires: fixedNow.Add(4 * time.Minute),
	}
}

func sign(t *testing.T, o options) string {
	t.Helper()
	claims := Claims{Purpose: o.purpose, RegisteredClaims: jwt.RegisteredClaims{
		Issuer: o.issuer, Subject: o.subject, Audience: jwt.ClaimStrings{o.audience},
		IssuedAt: jwt.NewNumericDate(o.issued), ExpiresAt: jwt.NewNumericDate(o.expires),
	}}
	raw, err := jwt.NewWithClaims(o.method, claims).SignedString(o.key)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestAcceptsATokenTheAPIWouldIssue(t *testing.T) {
	claims, err := verifier().Verify(sign(t, defaults()))
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "user-1" || claims.Purpose != PurposeEventCover {
		t.Fatalf("unexpected claims %+v", claims)
	}
}

func TestRefusesBadTokens(t *testing.T) {
	cases := map[string]func(*options){
		"expired":           func(o *options) { o.expires = fixedNow.Add(-time.Minute); o.issued = fixedNow.Add(-6 * time.Minute) },
		"wrong secret":      func(o *options) { o.key = []byte("a-completely-different-secret-value!") },
		"wrong issuer":      func(o *options) { o.issuer = "someone-else" },
		"wrong audience":    func(o *options) { o.audience = "another-service" },
		"wrong purpose":     func(o *options) { o.purpose = "profile-picture" },
		"no subject":        func(o *options) { o.subject = "" },
		"lifetime too long": func(o *options) { o.expires = o.issued.Add(2 * time.Hour) },
		"issued in future": func(o *options) {
			o.issued = fixedNow.Add(time.Hour)
			o.expires = fixedNow.Add(time.Hour + 4*time.Minute)
		},
		"HS512 not HS256": func(o *options) { o.method = jwt.SigningMethodHS512 },
	}
	for name, change := range cases {
		o := defaults()
		change(&o)
		if _, err := verifier().Verify(sign(t, o)); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%s: got %v, want ErrInvalidToken", name, err)
		}
	}
}

func TestRefusesAlgNone(t *testing.T) {
	claims := Claims{Purpose: PurposeEventCover, RegisteredClaims: jwt.RegisteredClaims{
		Issuer: Issuer, Subject: "user-1", Audience: jwt.ClaimStrings{Audience},
		IssuedAt: jwt.NewNumericDate(fixedNow), ExpiresAt: jwt.NewNumericDate(fixedNow.Add(time.Minute)),
	}}
	raw, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := verifier().Verify(raw); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("an unsigned token was accepted: %v", err)
	}
}

func TestRefusesATokenWithoutExpiry(t *testing.T) {
	claims := Claims{Purpose: PurposeEventCover, RegisteredClaims: jwt.RegisteredClaims{
		Issuer: Issuer, Subject: "user-1", Audience: jwt.ClaimStrings{Audience}, IssuedAt: jwt.NewNumericDate(fixedNow),
	}}
	raw, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if _, err := verifier().Verify(raw); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("a token that never expires was accepted: %v", err)
	}
}

func TestRefusesATamperedToken(t *testing.T) {
	raw := sign(t, defaults())
	parts := strings.Split(raw, ".")
	forged := sign(t, func() options { o := defaults(); o.subject = "someone-else"; return o }())
	tampered := parts[0] + "." + strings.Split(forged, ".")[1] + "." + parts[2]
	if _, err := verifier().Verify(tampered); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("a token with a swapped payload was accepted: %v", err)
	}
}

func TestRefusesGarbage(t *testing.T) {
	for _, raw := range []string{"", "x", "a.b.c", "Bearer abc"} {
		if _, err := verifier().Verify(raw); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%q: got %v", raw, err)
		}
	}
}
