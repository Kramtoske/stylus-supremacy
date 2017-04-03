const Jasmine = require('jasmine')
const jasmine = new Jasmine()

jasmine.loadConfig({
	helpers: ['../edge/format.js'],
	stopSpecOnExpectationFailure: false,
	random: false
})

jasmine.configureDefaultReporter({
	showColors: false
})

const glob = require('glob')
const ps = require('process')
const fs = require('fs')
const pt = require('path')
const _ = require('lodash')
const { format } = require('../edge/format.js')

const filteredSpecName = _.chain(ps.argv).map((param, index, array) => (param === '--filter' || param === '-f') ? _.trim(array[index + 1], '"') : null).compact().first().value()

glob.sync('spec/' + (filteredSpecName || '*'))
	.filter(path => pt.extname(path) === '')
	.forEach(directory => {
		const inputFilePath = pt.join(directory, 'input.styl')
		const optionFilePath = pt.join(directory, 'formattingOptions.json')
		const outputFilePath = pt.join(directory, 'output.styl')
		const actualFilePath = pt.join(directory, 'actual.styl')
		const debuggingFilePath = pt.join(directory, 'debugging.json')

		const inputContent = fs.readFileSync(inputFilePath, 'utf8')
		const outputContent = fs.readFileSync(outputFilePath, 'utf8')

		let formattingOptions = null
		if (fs.existsSync(optionFilePath)) {
			formattingOptions = require('../' + optionFilePath)
		}

		describe(pt.basename(directory), () => {
			it('', () => {
				if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath)
				if (fs.existsSync(debuggingFilePath)) fs.unlinkSync(debuggingFilePath)

				const actual = format(inputContent, formattingOptions)

				if (actual.text === outputContent) { // In case of success
					expect(true).toBeTruthy()

				} else { // In case of failure
					fs.writeFileSync(actualFilePath, actual.text, 'utf8')
					fs.writeFileSync(debuggingFilePath, JSON.stringify(actual.tree, null, '\t'), 'utf8')

					const stack = [
						inputFilePath,
						actualFilePath,
						outputFilePath,
						debuggingFilePath
					].map(path => pt.resolve(path)).join('\n')

					const resultLines = actual.text.replace(/\t/gm, '··').replace(/\r/gm, '¶').split('\n')
					const expectLines = outputContent.replace(/\t/gm, '··').replace(/\r/gm, '¶').split('\n')

					let lineIndex = -1
					const lineLimit = Math.min(resultLines.length, expectLines.length)
					while (++lineIndex < Math.min(resultLines.length, expectLines.length)) {
						if (resultLines[lineIndex] !== expectLines[lineIndex]) {
							let diffs = ''
							let charIndex = -1
							const charLimit = Math.max(resultLines[lineIndex].length, expectLines[lineIndex].length)
							while (++charIndex < charLimit) {
								if (resultLines[lineIndex][charIndex] !== expectLines[lineIndex][charIndex]) {
									diffs += '^'
								} else {
									diffs += ' '
								}
							}

							return fail({
								message: [
									'The first mismatched was at line ' + (lineIndex + 1) + '.',
									'  Actual: ' + resultLines[lineIndex],
									'  Expect: ' + expectLines[lineIndex],
									'          ' + diffs
								].join('\n'),
								stack
							})
						}
					}

					return fail({
						message: 'It was not clear to show the difference. Please check out the files below.',
						stack
					})
				}
			})
		})
	})

jasmine.execute()