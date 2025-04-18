const http = new XMLHttpRequest();
var data;
var output = '';
var style = 0;
var escapeNewLine = false;
var spaceComment = false;
var includeComments = true;
var pendingUrls = [];
var currentUrlIndex = 0;
var combinedOutput = '';

const onDocumentReady = () => {
  const urls = getQueryParamUrl();
  if (urls) {
    document.getElementById('url-field').value = urls;
  }
  if (getFieldUrl()) {
    startExport();
  }
};

const getQueryParamUrl = () =>
  new URLSearchParams(window.location.search).get('url') ?? null;
const getFieldUrl = () => document.getElementById('url-field').value;

function startExport() {
  console.log('Start exporting');
  setStyle();
  combinedOutput = '';

  const lines = getFieldUrl()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length > 0) {
    // Show progress block
    document.getElementById('progress-block').removeAttribute('hidden');
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Processing URLs...';

    // Check if first line is a URL
    const isUrl = /^https?:\/\//i.test(lines[0]);
    if (!isUrl) {
      // Use first line as filename if no custom filename is set
      const customFilename = document.getElementById('custom-filename').value;
      if (!customFilename) {
        document.getElementById('custom-filename').value =
          lines[0].replace(/[^a-zA-Z0-9-_]/g, '_') + '.md';
      }
      // Remove the first line from URLs to process
      pendingUrls = lines.slice(1);
    } else {
      pendingUrls = lines;
      // Only clear filename if it's empty (preserve user-entered filename)
      if (!document.getElementById('custom-filename').value) {
        document.getElementById('custom-filename').value = '';
      }
    }
    currentUrlIndex = 0;
    processNextUrl();
  } else {
    console.log('No urls provided');
  }
}

function processNextUrl() {
  if (currentUrlIndex < pendingUrls.length) {
    const url = pendingUrls[currentUrlIndex];
    console.log(`Processing URL ${currentUrlIndex + 1}/${pendingUrls.length}: ${url}`);

    // Update progress
    const progress = ((currentUrlIndex + 1) / pendingUrls.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Processing URL ${
      currentUrlIndex + 1
    } of ${pendingUrls.length}: ${url}`;

    setTimeout(() => {
      fetchData(url);
    }, 500);
  } else {
    console.log('All URLs processed');
    // Hide progress block
    document.getElementById('progress-block').setAttribute('hidden', '');

    // Update the display and create download link with combined output
    var output_display = document.getElementById('ouput-display');
    var output_block = document.getElementById('ouput-block');
    var output_files = document.getElementById('output-files');
    output_block.removeAttribute('hidden');

    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Get custom filename if set, otherwise use default
    const customFilename = document.getElementById('custom-filename').value;
    const filename = customFilename || `reddit_posts_${currentDate}_${currentTime}.md`;

    // Create download link for combined posts
    const downloadLink = document.createElement('a');
    downloadLink.className = 'btn btn-success';
    downloadLink.style.marginRight = '10px';
    downloadLink.style.marginBottom = '10px';
    downloadLink.download = filename;
    downloadLink.href = URL.createObjectURL(
      new Blob([collapseMultipleNewlines(combinedOutput)], { type: 'text/plain' })
    );
    downloadLink.textContent = 'Download All Posts';
    output_files.appendChild(downloadLink);

    // Update preview with combined output
    output_display.innerHTML = collapseMultipleNewlines(combinedOutput);
  }
}

function fetchData(url) {
  output = '';

  http.open('GET', `${url}.json`);
  http.responseType = 'json';
  http.send();

  http.onload = function () {
    data = http.response;
    const post = data[0].data.children[0].data;
    const comments = data[1].data.children;
    displayTitle(post);

    if (includeComments && comments) {
      output += '\n\n## Comments\n\n';
      comments.forEach(displayComment);
    }

    // Add separator between posts
    if (currentUrlIndex > 0) {
      combinedOutput += '\n\n---\n\n';
    }
    combinedOutput += output;

    console.log('Done processing URL');

    // Process next URL
    currentUrlIndex++;
    processNextUrl();
  };
}

function setStyle() {
  if (document.getElementById('treeOption').checked) {
    style = 0;
  } else {
    style = 1;
  }

  if (document.getElementById('escapeNewLine').checked) {
    escapeNewLine = true;
  } else {
    escapeNewLine = false;
  }

  if (document.getElementById('spaceComment').checked) {
    spaceComment = true;
  } else {
    spaceComment = false;
  }

  if (document.getElementById('includeComments').checked) {
    includeComments = true;
  } else {
    includeComments = false;
  }
}

function download(text, name, type) {
  var a = document.getElementById('a');
  a.removeAttribute('disabled');
  var file = new Blob([text], { type: type });
  a.href = URL.createObjectURL(file);
  a.download = name;
}

function displayTitle(post) {
  output += `# ${post.title}\n`;
  if (post.selftext) {
    output += `\n${post.selftext}\n`;
  }
  output += `\n[permalink](https://reddit.com${post.permalink})`;
  const createdDate = new Date(post.created_utc * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  output += `\nby *${post.author}* (↑ ${post.ups}/ ↓ ${post.downs}) ${createdDate}`;
}

function formatComment(text) {
  if (escapeNewLine) {
    return text.replace(/(\r\n|\n|\r)/gm, '');
  } else {
    return text;
  }
}

function displayComment(comment, index) {
  if (style == 0) {
    depthTag = '─'.repeat(comment.data.depth);
    if (depthTag != '') {
      output += `├${depthTag} `;
    } else {
      output += `##### `;
    }
  } else {
    depthTag = '\t'.repeat(comment.data.depth);
    if (depthTag != '') {
      output += `${depthTag}- `;
    } else {
      output += `- `;
    }
  }

  if (comment.data.body) {
    console.log(formatComment(comment.data.body));
    output += `${formatComment(comment.data.body)} ⏤ by *${comment.data.author}* (↑ ${
      comment.data.ups
    }/ ↓ ${comment.data.downs})\n`;
  } else {
    output += 'deleted \n';
  }

  if (comment.data.replies) {
    const subComment = comment.data.replies.data.children;
    subComment.forEach(displayComment);
  }

  if (comment.data.depth == 0 && comment.data.replies) {
    if (style == 0) {
      output += '└────\n\n';
    }
    if (spaceComment) {
      output += '\n';
    }
  }
}

function collapseMultipleNewlines(text) {
  return text.replace(/\n{2,}/g, '\n\n');
}
