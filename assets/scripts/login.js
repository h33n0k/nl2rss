const form = document.querySelector('form')
const error = form.querySelector('p.error')
const input = document.querySelector('input')

function removeError() {
	error.classList.remove('active')
	error.innerText = ''
}

function setError(message) {
	error.classList.add('active')
	error.innerText = message
}

form.addEventListener('submit', async (event) => {
	event.preventDefault()

	try {
		await fetch('/login', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				password: input.value
			})
		})
			.then((response) => response.json())
			.then((response) => {
				if (response.status !== 200) {
					setError(response.message)
				} else {
					removeError()
					window.location.assign('/')
				}
			})
	} catch (error) {
		setError('Unexpected Error.')
	}
})
