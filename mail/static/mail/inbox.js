document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email('', '', ''));

  // Add event listener to the compose form submit event
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(recipients = '', subject = '', body = '') {
  // Clear the email view
  const emailView = document.querySelector('#email-view');
  emailView.innerHTML = '';

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Pre-fill composition fields
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  
  // Show the mailbox name
  const pageName = mailbox.charAt(0).toUpperCase() + mailbox.slice(1);
  document.querySelector('#emails-view').innerHTML = `<h3>${pageName}</h3>`;

  // Make GET request to retrieve emails for the specified mailbox
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Display the emails in the mailbox
      display_emails(emails, mailbox);
    })
    .catch(error => {
      console.error(error);
      // Handle error
    });

  // Clear the email view
  const emailView = document.querySelector('#email-view');
  emailView.innerHTML = '';

  // Retrieve email blocks
  const emailBlocks = document.querySelectorAll('.email-block');

  // Add an event listener to each email block
  emailBlocks.forEach(emailBlock => {
    emailBlock.addEventListener('click', () => {
      const emailId = emailBlock.dataset.emailId;
      open_email(emailId);
    });
  });

  // Add event listeners to archive and unarchive buttons
  emailBlocks.forEach(emailBlock => {
    const archiveBtn = emailBlock.querySelector('.archive-btn');
    const unarchiveBtn = emailBlock.querySelector('.unarchive-btn');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const emailId = event.target.dataset.emailId;
        archive_email(emailId);
      });
    }
    if (unarchiveBtn) {
      unarchiveBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const emailId = event.target.dataset.emailId;
        unarchive_email(emailId);
      });
    }
  });

  // Show/hide email blocks based on mailbox and reset open email
  emailBlocks.forEach(emailBlock => {
    if (emailBlock.dataset.mailbox !== mailbox) {
      emailBlock.style.display = 'none';
    } else {
      emailBlock.style.display = 'block';
    }
  });
}

function display_emails(emails, mailbox) {
  const emailsContainer = document.querySelector('#email-view');

  // Iterate over each email and create HTML blocks to display them
  emails.forEach(email => {
    const emailBlock = document.createElement('div');
    emailBlock.classList.add('email-block');
    if (email.read) {
      emailBlock.classList.add('read-email');
    } else {
      emailBlock.classList.add('unread-email');
    }

    // Add sender, subject, and timestamp to the email block
    emailBlock.innerHTML = `
      <div class="email-info">
      <div class="email-sender">${email.sender}</div>
      <div class="email-subject">${email.subject}</div>
      <div class="email-timestamp">${email.timestamp}</div>
      </div>
      <button class="btn btn-sm btn-outline-primary" id="archive" data-email-id="${email.id}" style="display: ${mailbox === 'inbox' ? 'inline-block' : 'none'}">Archive</button>
      <button class="btn btn-sm btn-outline-primary" id="unarchive" data-email-id="${email.id}" style="display: ${mailbox === 'archive' ? 'inline-block' : 'none'}">Unarchive</button>
    `;

    // Add event listeners to archive and unarchive buttons
    emailBlock.querySelector('#archive').addEventListener('click', (event) => {
      event.stopPropagation();
      const emailId = event.target.dataset.emailId;
      archive_email(emailId);
    });

    emailBlock.querySelector('#unarchive').addEventListener('click', (event) => {
      event.stopPropagation();
      const emailId = event.target.dataset.emailId;
      unarchive_email(emailId);
    });

    // Add click event listener to open the email when clicked
    emailBlock.addEventListener('click', () => open_email(email.id));

    // Append the email block to the emails container
    emailsContainer.appendChild(emailBlock);
  });
}

function mark_email_as_read(emailId) {
  // Make a PUT request to mark the email as read
  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({ read: true })
  })
    .then(response => {
      if (response.ok) {
        // Email marked as read successfully
        console.log('Email marked as read');
      } else {
        // Handle error
        console.error('Failed to mark email as read');
      }
    })
    .catch(error => {
      console.error(error);
      // Handle error
    });
}

function open_email(emailId) {
  // Hide other emails
  const emailBlocks = document.querySelectorAll('.email-block');
  emailBlocks.forEach(emailBlock => {
    if (emailBlock.dataset.emailId === emailId) {
      emailBlock.style.display = 'block'; // Show selected email
    } else {
      emailBlock.style.display = 'none'; // Hide other emails
    }
  });

  // Make a GET request to retrieve the specific email data
  fetch(`/emails/${emailId}`)
    .then(response => response.json())
    .then(email => {
      // Replace new lines with <br> tags in the email body
      const formattedBody = email.body.replace(/\n/g, "<br>");

      // Display the email details in the designated div or view
      const emailView = document.querySelector('#email-view');
      emailView.innerHTML = `
        <h3>From: ${email.sender}</h3>
        <h3>To: ${email.recipients.join(', ')}</h3>
        <h3>Subject: ${email.subject}</h3>
        <h3>Timestamp: ${email.timestamp}</h3>
        <p>${formattedBody}</p>
        <button class="btn btn-sm btn-primary" id="reply-btn" data-email-id="${email.id}">Reply</button>
      `;

      // Mark the email as read
      mark_email_as_read(emailId);

      const replyBtn = emailView.querySelector('#reply-btn');
      replyBtn.addEventListener('click', () => {
        const recipients = email.sender;
        const subject = email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`;
        const body = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}`;

        compose_email(recipients, subject, body);
      });
    })
    .catch(error => {
      console.error(error);
      // Handle error
    });
}

function send_email(event) {
  event.preventDefault(); // Prevent default form submission behavior

  // Get form values
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Create email data object
  const emailData = {
    recipients: recipients,
    subject: subject,
    body: body
  };

  // Send POST request to /emails to send the email
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify(emailData)
  })
  .then(response => {
    if (response.ok) {
      // Email sent successfully, load the Sent folder
      load_mailbox('sent');
    } else {
      // Handle error response
      throw new Error('Error sending email');
    }
  })
  .catch(error => {
    console.error(error);
    // Handle error
  });
}

function archive_email(emailId) {
  // Make a PUT request to mark the email as archived
  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: true })
  })
    .then(response => {
      if (response.ok) {
        // Email marked as archived successfully
        console.log('Email archived');
        load_mailbox('inbox'); // Load the inbox after archiving
      } else {
        // Handle error
        console.error('Failed to archive email');
      }
    })
    .catch(error => {
      console.error(error);
      // Handle error
    });
}

function unarchive_email(emailId) {
  // Make a PUT request to mark the email as unarchived
  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({ archived: false })
  })
    .then(response => {
      if (response.ok) {
        // Email marked as unarchived successfully
        console.log('Email unarchived');
        load_mailbox('archive'); // Load the archive after unarchiving
      } else {
        // Handle error
        console.error('Failed to unarchive email');
      }
    })
    .catch(error => {
      console.error(error);
      // Handle error
    });
}