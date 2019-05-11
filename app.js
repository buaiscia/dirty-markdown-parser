const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');

const inputFileSpecified = Object.keys(argv).includes('i');
const outputFileSpecified = Object.keys(argv).includes('o');

const buf = fs.readFileSync(argv.i, 'utf8');
const str = buf.toString();

const lineArray = str.split('\n');

const checkForInline = content => {
  const splitContent = content.split('');
  let output = '';

  let currentlyOpeningTag = true;

  splitContent.forEach(char => {
    if (char === '`') {
      if (currentlyOpeningTag) {
        output += '<code>';
      } else {
        output += '</code>';
      }

      currentlyOpeningTag = !currentlyOpeningTag;
    } else {
      output += char;
    }
  })

  return output;
}

const checkForDoubleAsterisk = content => {
  const occs = [];

  return content.replace(/\*\*/g, (match, p1) => {
    occs.push(p1);

    const even = occs.indexOf(p1) % 2 === 0;
    return even ? '<strong>' : '</strong>';
  });
}

const checkForSingleAsterisk = content => {
  const occs = [];

  return content.replace(/\*/g, (match, p1) => {
    occs.push(p1);

    const even = occs.indexOf(p1) % 2 === 0;
    return even ? '<em>' : '</em>';
  }); 
}

const checkForDoubleUnderscore = content => {
  const occs = [];

  return content.replace(/\_\_/g, (match, p1) => {
    occs.push(p1);

    const even = occs.indexOf(p1) % 2 === 0;
    return even ? '<strong>' : '</strong>';
  });
}

const checkForSingleUnderscore = content => {
  const occs = [];

  return content.replace(/\_/g, (match, p1) => {
    occs.push(p1);

    const even = occs.indexOf(p1) % 2 === 0;
    return even ? '<em>' : '</em>';
  }); 
}

const checkForTilde = content => {
  const occs = [];

  return content.replace(/\~\~/g, (match, p1) => {
    occs.push(p1);

    const even = occs.indexOf(p1) % 2 === 0;
    return even ? '<del>' : '</del>';
  }); 
}

const checkForLink = content => {
  if (content.includes('](') && !content.startsWith('!')) {

    let [title, link] = content.split('](');

    title = title.replace('[');
    link = link.slice(0, -1);

    return `<a href="${link}">${title.replace('undefined', '')}</a>`;
  }

  return content;
}

const replaceInLine = (line, from, to) => {
  return `<${to}>${checkForLink(line.replace(from, ''))}</${to}>`;
}

const parseLineArray = arr => {
  const newArray = [];

  arr.forEach((line, index) => {
    let lineHasChanged = false;
    let toPushBefore = '';
    let toPushAfter = '';

    // hr
    if (line === '***') {
      line = '<hr>';
      lineHasChanged = true;
    }

    // blockquote
    if (line.startsWith('> ')) {
      line = replaceInLine(line, '> ', 'blockquote');
    }

    // headings
    if (line.startsWith('###### ')) {
      line = replaceInLine(line, '###### ', 'h6');
      lineHasChanged = true;
    } else if (line.startsWith('##### ')) {
      line = replaceInLine(line, '##### ', 'h5');
      lineHasChanged = true;
    } else if (line.startsWith('#### ')) {
      line = replaceInLine(line, '#### ', 'h4');
      lineHasChanged = true;
    } else if (line.startsWith('### ')) {
      line = replaceInLine(line, '### ', 'h3');
      lineHasChanged = true;
    } else if (line.startsWith('## ')) {
      line = replaceInLine(line, '## ', 'h2');
      lineHasChanged = true;
    } else if (line.startsWith('# ')) {
      line = replaceInLine(line, '# ', 'h1');
      lineHasChanged = true;
    }

    // unordered list
    if (line.startsWith('* ')) {
      line = replaceInLine(line, '* ', 'li');

      const previousLine = arr[index - 1] || '';
      const nextLine = arr[index + 1] || '';

      if (!previousLine.startsWith('* ')) {
        toPushBefore = '<ul>';
      }

      if (!nextLine.startsWith('* ')) {
        toPushAfter = '</ul>';
      }

      lineHasChanged = true;
    }

    // ordered list
    if (line.match(/(^\d{1,}. )/gm)) {
      const match = line.match(/(^\d{1,}. )/gm);

      const dotIndex = line.indexOf('.');
      const slicedLine = line.slice(dotIndex + 2);

      line = replaceInLine(slicedLine, '', 'li');

      const previousLine = arr[index - 1] || '';
      const nextLine = arr[index + 1] || '';

      if (!previousLine.match(/(^\d{1,}. )/gm)) {
        toPushBefore = '<ol>';
      }

      if (!nextLine.match(/(^\d{1,}. )/gm)) {
        toPushAfter = '</ol>';
      }

      lineHasChanged = true;
    }

    // links and images
    if (line.includes('](')) {
      if (line.startsWith('!')) {
        // is image

        let [alt, src] = line.split('](');

        alt = alt.replace('![');
        src = src.slice(0, -1);

        line = `<img alt="${alt.replace('undefined', '')}" src="${src}" />`;
      } else {
        // is link
        line = checkForLink(line);
      }

      lineHasChanged = true;
    }

    if (!lineHasChanged) {
      line = line === '' ? line : `<p>${line}</p>`;
    }

    line = checkForInline(line);
    line = checkForDoubleAsterisk(line);
    line = checkForSingleAsterisk(line);
    line = checkForDoubleUnderscore(line);
    line = checkForSingleUnderscore(line);
    line = checkForTilde(line);

    // PUSHING
    if (toPushBefore) {
      newArray.push(toPushBefore);
    }

    newArray.push(line);

    if (toPushAfter) {
      newArray.push(toPushAfter);
    }
  })

  return newArray;
}

const writeOutput = arr => {
  const strOutput = arr.join('\n');

  fs.readFile('template.html', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }

    const result = data.replace(/REPLACE/g, strOutput);
  
    fs.writeFile(outputFileSpecified ? argv.o : 'output.html', result, 'utf8', function (err) {
      if (err) {
        return console.log(err);
      }
    });
  });
}

writeOutput(parseLineArray(lineArray));