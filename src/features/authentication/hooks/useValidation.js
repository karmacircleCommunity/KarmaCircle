const useValidation = (credentials, userSignup, clubSignup) => {
  const errors = [];
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const nameRegex = /^[a-zA-Z]+$/;
  const clubnameRegex = /^[a-zA-Z\s]+$/;
  const urlRegex =
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-zA-Z0-9]+([a-zA-Z0-9-]+)?(\.[a-zA-Z0-9-]+)+([/?#][a-zA-Z0-9-]+)*$/;

  if (!credentials.email) {
    errors.push({
      error: true,
      message: "Please enter your email",
      field: "email",
    });
  } else if (!emailRegex.test(credentials.email)) {
    errors.push({
      error: true,
      message: "Please enter a valid email",
      field: "email",
    });
  }

  if (!credentials.password) {
    errors.push({
      error: true,
      message: "Please enter your password",
      field: "password",
    });
  } else if (credentials.password.length < 6) {
    errors.push({
      error: true,
      message: "Password must be at least 6 characters long",
      field: "password",
    });
  }

  if (credentials.confirmPassword) {
    if (credentials.password !== credentials.confirmPassword) {
      errors.push({
        error: true,
        message: "Password and confirm password do not match",
        field: "confirmPassword",
      });
    }
  }

  if (userSignup) {
    if (!credentials.firstName) {
      errors.push({
        error: true,
        message: "Please enter your first name",
        field: "firstName",
      });
    } else if (!nameRegex.test(credentials.firstName)) {
      errors.push({
        error: true,
        message: "Please enter a valid first name",
        field: "firstName",
      });
    } else if (
      credentials.firstName.length < 3 ||
      credentials.firstName.length > 30
    ) {
      errors.push({
        error: true,
        message: "First name must be between 3 and 30 characters long",
        field: "firstName",
      });
    }

    if (!credentials.lastName) {
      errors.push({
        error: true,
        message: "Please enter your last name",
        field: "lastName",
      });
    } else if (!nameRegex.test(credentials.lastName)) {
      errors.push({
        error: true,
        message: "Please enter a valid last name",
        field: "lastName",
      });
    } else if (
      credentials.lastName.length < 3 ||
      credentials.lastName.length > 30
    ) {
      errors.push({
        error: true,
        message: "Last name must be between 3 and 30 characters long",
        field: "lastName",
      });
    }
  }

  if (clubSignup) {
    if (!credentials.name) {
      errors.push({
        error: true,
        message: "Please enter your club name",
        field: "name",
      });
    } else if (!clubnameRegex.test(credentials.name)) {
      errors.push({
        error: true,
        message: "Please enter a valid club name",
        field: "name",
      });
    } else if (credentials.name.length < 3 || credentials.name.length > 30) {
      errors.push({
        error: true,
        message: "Club name must be between 3 and 30 characters long",
        field: "name",
      });
    }

    if (!credentials.tagLine) {
      errors.push({
        error: true,
        message: "Please enter your club tagline",
        field: "tagLine",
      });
    } else if (
      credentials.tagLine.length < 20 ||
      credentials.tagLine.length > 220
    ) {
      errors.push({
        error: true,
        message: "Club tagline must be between 20 and 220 characters long.",
        field: "tagLine",
      });
    }

    if (!credentials.description) {
      errors.push({
        error: true,
        message: "Please enter your club description",
        field: "description",
      });
    } else if (
      credentials.description.length < 100 ||
      credentials.description.length > 1000
    ) {
      errors.push({
        error: true,
        message:
          "Club description must be between 100 and 1000 characters long",
        field: "description",
      });
    }

    if (!credentials.iframe) {
      errors.push({
        error: true,
        message: "Please enter your club iframe code",
        field: "iframe",
      });
    }
  }

  if (credentials.website && !urlRegex.test(credentials.website)) {
    errors.push({
      error: true,
      message: "Please enter a valid website",
      field: "website",
    });
  }
  if (userSignup || clubSignup) {
    if (!credentials.slug) {
      errors.push({
        error: true,
        message: "Please enter your userName",
        field: "slug",
      });
    } else if (
      credentials.slug[0] === "/" ||
      credentials.slug[credentials.slug.length - 1] === "/"
    ) {
      errors.push({
        error: true,
        message: "Username must not start or end with '/'",
        field: "slug",
      });
    } else if (/[^a-zA-Z0-9-]/.test(credentials.slug)) {
      errors.push({
        error: true,
        message: "Username must contain only letters, numbers and '-'",
        field: "slug",
      });
    } else if (credentials.slug.length < 3 || credentials.slug.length > 30) {
      errors.push({
        error: true,
        message: "Username must be between 3 and 30 characters long",
        field: "slug",
      });
    }

    if (!credentials.city) {
      errors.push({
        error: true,
        message: "Please enter your city",
        field: "city",
      });
    }

    if (!credentials.state) {
      errors.push({
        error: true,
        message: "Please enter your state",
        field: "state",
      });
    }

    if (!credentials.address) {
      errors.push({
        error: true,
        message: "Please enter your address",
        field: "address",
      });
    } else if (
      credentials.address.length < 20 ||
      credentials.address.length > 200
    ) {
      errors.push({
        error: true,
        message: "Address must be between 20 and 200 characters long",
        field: "address",
      });
    }

    if (!credentials.country) {
      errors.push({
        error: true,
        message: "Please enter your country",
        field: "country",
      });
    }

    const pincode = credentials?.pincode?.toString();

    if (!credentials.pincode) {
      errors.push({
        error: true,
        message: "Please enter your pincode",
        field: "pincode",
      });
    } else if (pincode.length !== 6 && pincode.length !== 5) {
      errors.push({
        error: true,
        message: "Please enter a valid pincode",
        field: "pincode",
      });
    }
  }

  return errors.length ? errors : { error: false, message: "" };
};

export default useValidation;
