const fileInput = document.getElementById('sampleFile')
const p = document.querySelector('p')
const formContainer = document.getElementById('formcontainer')

fileInput.onchange = () => {
	const selectedFiles = [...fileInput.files]

	formContainer.style.backgroundColor = 'grey'
	p.textContent = selectedFiles.map(s => s.size).join(', ')
}

async function onSubmit(form) {
	await fetch('/upload', {
    	method: 'POST',
    	body: new FormData(form)
	})
	.then(response => {
		if(response.statusText === 'OK')
			formContainer.style.backgroundColor = 'green'
		else
			throw Error
	})
	.catch(err => {
		if(err)
			formContainer.style.backgroundColor = 'red'
	})
}
