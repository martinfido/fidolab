
class Note {

  constructor(name, ratio, cents) {
    this.name = name;
    this.ratio = ratio;
    this.cents = cents;
  }

  static ofRatio(name, ratio, normalize) {
    if (normalize) {
      while (ratio < 1) { ratio *= 2; }
      while (ratio >= 2) { ratio /= 2; }
    }
    // TODO rounding error is seen for 1/11 SC and 1/12 PC
    let cents = Math.log(ratio) * (1200 / Math.LN2);
    return new Note(name, ratio, cents);
  }

  static ofCents(name, cents, normalize) {
    if (normalize) {
      cents = ((cents % 1200) + 1200) % 1200;
    }
    let ratio = Math.exp(cents / (1200 * Math.LOG2E));
    return new Note(name, ratio, cents);
  }

  // parse note name and cents or ratio, e.g. "F:498.04" or "C#:25/24"
  static parse(str) {
    let name = str;
    let parts = str.split(":");
    if (parts.length === 2) {
      name = parts[0];
      str = parts[1];
    }
    let fraction = str.split("/");
    if ((fraction.length === 2) && !isNaN(fraction[0]) && !isNaN(fraction[1])) {
      return Note.ofRatio(name, fraction[0] / fraction[1], true);
    }
    let num = Number(str);
    if (!Number.isNaN(num)) {
      return Note.ofCents(name, num, true);
    }
    return null;
  }

  subtract_ratio(ratio) {
    return Note.ofRatio(this.name, this.ratio / ratio, true);
  }

  ratio_str() {
    return this.ratio.toFixed(13).replace(/\.?0+$/, '');
  }

  cent_str(offset) {
    let cents = this.cents + offset;
    cents = ((cents % 1200) + 1200) % 1200;
    return cents.toFixed(3);
  }

  fraction_str() {
    const biggest_denom = 131072;
    for (let bot = 1; bot < biggest_denom; bot++) {
      let top = Note.approxInt(this.ratio * bot);
      if (top) return top + '/' + bot;
    }
    return null;
  }

  static cent_offset_str(cents, hundreds) {
    cents = ((cents % 1200) + 1200) % 1200;
    if (isNaN(hundreds)) {
        hundreds = Math.round(cents / 100) * 100;
    }
    var offset = cents - hundreds;
    while (offset < -600) offset += 1200;
    while (offset > 600) offset -= 1200;
    return hundreds + ((offset >= 0) ? '+' : '') + offset.toFixed(3);
  }

  static nearest_hundred(cents) {
    let hundreds = Math.round(cents / 100) * 100;
    hundreds = ((hundreds % 1200) + 1200) % 1200;
    return hundreds;
  }

  static approxInt(num) {
    let mod = num % 1;
    if ((mod > 0.0000000000001) && (mod < 0.9999999999999)) {
      return null;
    }
    return num.toFixed(12).replace(/\.0+$/, '');
    //let fixed = num.toFixed(12);
    //let round = fixed.replace(/\.0+$/, '');
    //return (fixed.length !== round.length) ? round : null;
  }
}

Note.pythagorean_comma = Math.pow(3, 12) / Math.pow(2, 19);
Note.syntonic_comma = 81 / 80;

class Temperament {

  static equal(notes_per_octave) {
    const names = {
      12: [ 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B' ]
    };
    var notes = [];
    for (var i = 0; i < notes_per_octave; i++) {
      notes.push(Note.ofCents('' + i, 1200 * i / notes_per_octave));
    }
    return notes;
  }

  static meantone(comma, division) {
    let major_fifth = (3 / 2) / Math.pow(comma, division);
    let whole_tone = major_fifth * major_fifth / 2;
    let major_third = whole_tone * whole_tone; // major_sixth * major_fifth / 2
    let major_fourth = 2 / major_fifth; // major_fifth / whole_tone;
    let major_sixth = whole_tone * major_fifth;
    let major_seventh = major_third * major_fifth; // major_sixth * whole_tone;
    let diatonic_semitone = 2 / major_seventh;
    let chromatic_semitone = whole_tone / diatonic_semitone;

    let names = [ 'C', 'D', 'E', 'F', 'G', 'A', 'B' ];
    //let names = ['1', '2', '3', '4', '5', '6', '7'];
    let notes = [];

    function add(name, ratio) {
      notes.push(Note.ofRatio(name, ratio));
      notes.push(Note.ofRatio(name + '♯', ratio * chromatic_semitone));
      notes.push(Note.ofRatio(name + '♭', ratio / chromatic_semitone, true));
    }

    add(names[0], 1);
    add(names[1], whole_tone);
    add(names[2], major_third);
    add(names[3], major_fourth);
    add(names[4], major_fifth);
    add(names[5], major_sixth);
    add(names[6], major_seventh);

    notes.sort(function (a, b) { return a.ratio - b.ratio; });
    return notes;
  }

  static of_names_ratios(names_ratios) {
    let ratio = 1;
    let notes = [];

    for (let nr of names_ratios) {
      if (typeof nr === 'number') {
        ratio *= nr;
      } else {
        notes.push(Note.ofRatio(nr, ratio, true));
      }
    }

    notes.sort(function (a, b) { return a.ratio - b.ratio; });
    return notes;
  }

  // larips.com
  static bach_lehman_1722() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.pythagorean_comma, 1 / 6);
    const half = pure / Math.pow(Note.pythagorean_comma, 1 / 12);

    return Temperament.of_names_ratios([
      1 / narrow,
      'F', narrow, 'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow,
      'E', pure, 'B', pure, 'F♯', pure,
      'C♯', half, 'G♯', half, 'E♭', half, 'B♭'
    ]);
  }

  // casfaculty.case.edu/ross-duffin/why-i-hate-vallotti-or-is-it-young
  static vallotti() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.pythagorean_comma, 1 / 6);

    return Temperament.of_names_ratios([
      'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow, 'E', narrow,
      'B', pure, 'F♯', pure, 'C♯', pure, 'G♯', pure, 'E♭', pure, 'B♭', pure, 'F'
    ]);
  }

  // en.wikipedia.org/wiki/Young_temperament
  static young_1() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.syntonic_comma, 3 / 16);
    const half = pure / (Math.pow(Note.pythagorean_comma, 1 / 4) / Math.pow(Note.syntonic_comma, 3 / 16));

    return Temperament.of_names_ratios([
      'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow,
      'E', half, 'B', half,
      'F♯', pure, 'C♯', pure, 'G♯', pure, 'E♭', pure,
      'B♭', half, 'F'
    ]);
  }

  // casfaculty.case.edu/ross-duffin/why-i-hate-vallotti-or-is-it-young
  static young_2() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.pythagorean_comma, 1 / 6);

    return Temperament.of_names_ratios([
      'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow, 'E', narrow, 'B', narrow,
      'F♯', pure, 'C♯', pure, 'G♯', pure, 'E♭', pure, 'B♭', pure, 'F'
    ]);
  }

  // TODO verify http://www-personal.umich.edu/~bpl/larips/bachtemps.html
  static kellner() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.pythagorean_comma, 1 / 5);

    return Temperament.of_names_ratios([
      'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow, 'E', pure, 'B', narrow,
      'F♯', pure, 'C♯', pure, 'G♯', pure, 'E♭', pure, 'B♭', pure, 'F'
    ]);
  }

  static kirnberger_3() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.syntonic_comma, 1 / 4);

    return Temperament.of_names_ratios([
      'C♯', pure, 'A♭', pure, 'E♭', pure, 'B♭', pure, 'F', pure, 'C', narrow,
      'G', narrow, 'D', narrow, 'A', narrow, 'E', pure, 'B', pure, 'F♯'
    ]);
  }

  // en.wikipedia.org/wiki/Werckmeister_temperament
  static werckmeister_3() {
    return [
      Note.ofRatio('C', 1),
      Note.ofRatio('C♯', 256/243),
      Note.ofRatio('D', 64/81 * Math.sqrt(2)),
      Note.ofRatio('E♭', 32/27),
      Note.ofRatio('E', 256/243 * Math.pow(2, 1/4)),
      Note.ofRatio('F', 4/3),
      Note.ofRatio('F♯', 1024/729),
      Note.ofRatio('G', 8/9 * Math.pow(8, 1/4)),
      Note.ofRatio('G♯', 128/81),
      Note.ofRatio('A', 1024/729 * Math.pow(2, 1/4)),
      Note.ofRatio('A♯', 16/9),
      Note.ofRatio('B', 128/81 * Math.pow(2, 1/4))
    ];
  }

  // michaelharrison.com
  static revelation() {
    return Temperament.custom("F:1/1 F♯:63/64 G:9/8 G♯:567/512 A:81/64 B♭:21/16 B:729/512 C:3/2 C♯:189/128 D:27/16 E♭:7/4 E:243/128");
  }

  static welltunedpiano() {
    return Temperament.custom('E♭:1/1 E:567/512 F:9/8 F♯:147/128 G:21/16 G♯:1323/1024 A:189/128 B♭:3/2 B:49/32 C:7/4 C♯:441/256 D:63/32');
  }

  static pythagorean() {
    return Temperament.custom("C:1/1 C♯:2187/2048 D:9/8 E♭:32/27 E:81/64 F:4/3 F♯:729/512 G:3/2 G♯:128/81 A:27/16 A♯:16/9 B:243/128");
  }

  static prinz() {
    const pure = 3 / 2;
    const narrow = pure / Math.pow(Note.syntonic_comma, 1 / 4);

    return Temperament.of_names_ratios([
      'F♯', pure, 'C♯', pure, 'G♯', pure, 'E♭', pure, 'B♭', pure, 'F', pure,
      'C', narrow, 'G', narrow, 'D', narrow, 'A', narrow, 'E', pure, 'B'
    ]);

    return Temperament.custom("A:0 Bb:106.35 B:198.53 C:310.26 C#:400.49 D:503.42 Eb:604.4 E:696.58 F:808.31 F#:898.53 G:1006.84 G#:1102.44");
  }

  static thidell_formula_1() {
    return Temperament.custom("A:0 B♭:96 B:199 C:302 C♯:396 D:502 E♭:596 E:698 F:800 F♯:896 G:1004 G♯:1096");
  }

  static custom(notes_str) {
    let notes = [];
    for (let str of notes_str.split(" ")) {
      let note = Note.parse(str);
      if (note) {
        notes.push(note);
      }
    }
    //notes.sort(function (a, b) { return a.ratio - b.ratio; });
    return notes;
  }
}
