async function test() {
  const payload = {
    caption: "Test caption from script",
    platforms: ["YouTube"],
    mediaUrls: ["https://www.w3schools.com/html/mov_bbb.mp4"]
  };

  const response = await fetch("https://social-publisher-dvec.onrender.com/api/posts/schedule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer dev_default_user",
      "x-user-id": "dev_default_user"
    },
    body: JSON.stringify(payload)
  });

  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Response:", text);
}

test();
