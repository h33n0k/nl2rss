let sources = []
let feeds = []
let articles = []

const sourcesFilter = document.querySelector('#sources input[type="search"]')
const feedsFilter = document.querySelector('#feeds input[type="search"]')
const articlesFilter = document.querySelector('#articles input[type="search"]')

function serializeFormToJSON(formElement) {
	const formJSON = {}

	// Iterate over all form elements
	Array.from(formElement.elements).forEach((element) => {
		const { name, type, value, checked } = element

		// Skip elements without a name (they won't be in the JSON)
		if (!name) {
			return
		}

		if (type === 'checkbox') {
			// For checkboxes, store true if checked, false if unchecked
			formJSON[name] = checked
		} else if (type === 'textarea' || type === 'text' || type === 'email' || type === 'number') {
			// Include text, email, number, and textarea inputs
			formJSON[name] = value
		}
	})

	return formJSON
}

const modal = document.querySelector('#modal')

function openModal(title, attributes, onConfirm) {
	const p = modal.querySelector('p.title')
	p.innerText = title
	modal.querySelector('main').innerHTML = ''
	const container = document.createElement('form')
	modal.querySelector('main').appendChild(container)

	for (const attribute of attributes) {
		const section = document.createElement('section')

		const id = `modal-${attribute.label}-input`

		if (attribute.label) {
			const label = document.createElement('label')
			label.htmlFor = id
			label.innerText = `${attribute.label.slice(0, 1).toUpperCase()}${attribute.label.slice(1, attribute.label.length)}:`
			section.appendChild(label)
		}

		switch (attribute.type) {
			case 'switch':
				const checkbox = document.createElement('input')
				checkbox.type = 'checkbox'
				checkbox.role = 'switch'
				checkbox.name = attribute.label
				checkbox.id = id
				checkbox.checked = attribute.value || false
				section.appendChild(checkbox)
				break
			case 'element':
				section.appendChild(attribute.element)
				break
			case 'textarea':
				const textarea = document.createElement('textarea')
				textarea.id = id
				textarea.placeholder = attribute.label
				textarea.name = attribute.label
				textarea.value = attribute.value || ''
				section.appendChild(textarea)
				break
			default:
				const input = document.createElement('input')
				input.type = 'text'
				input.id = id
				input.placeholder = attribute.label
				input.name = attribute.label
				input.value = attribute.value || ''
				section.appendChild(input)
				break
		}

		container.appendChild(section)
	}

	modal.setAttribute('open', true)

	modal.querySelector('footer button.primary').onclick = async () => {
		const status = await onConfirm(serializeFormToJSON(container))

		if (status === true) {
			modal.setAttribute('open', false)
		}
	}
}

async function setArticle(article) {
	return fetch(`/api/article/${article.id}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			hidden: article.hidden
		})
	})
}

async function setSource(source, create = false) {
	return fetch(`/api/source/${source.id}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			enabled: source.enabled,
			feeds: source.feeds
		})
	})
}

async function setFeed(feed, create = false) {
	return fetch(`/api/feed/${feed.id}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: feed.name,
			title: feed.title,
			description: feed.description,
			enabled: feed.enabled
		})
	})
}

function createTable(head, array, row) {
	const table = document.createElement('table')
	const thead = document.createElement('thead')
	const htr = document.createElement('tr')

	for (const column of head) {
		const th = document.createElement('th')
		th.innerText = column
		htr.appendChild(th)
	}

	thead.appendChild(htr)
	const tbody = document.createElement('tbody')

	for (const item of array) {
		const tr = document.createElement('tr')

		for (const col of row) {
			const th = document.createElement('th')

			if (col.element) {
				th.appendChild(col.element(item))
			} else {
				th.innerText = col.value(item)
			}

			tr.appendChild(th)
		}

		tbody.appendChild(tr)
	}

	table.appendChild(thead)
	table.appendChild(tbody)

	return table
}

async function update() {
	articles = await fetch('/api/articles')
		.then((response) => response.json())
		.then((response) => response.data)

	sources = await fetch('/api/sources')
		.then((response) => response.json())
		.then((response) => response.data)

	feeds = await fetch('/api/feeds')
		.then((response) => response.json())
		.then((response) => response.data)

	const feedContainer = document.querySelector('#feeds main')
	feedContainer.innerHTML = ''
	feedContainer.appendChild(
		createTable(
			['#', 'name', 'title', 'sources', 'enabled', '', ''],
			feeds.filter((feed) => {
				if (feedsFilter.value === '') {
					return true
				}

				return feed.name.match(feedsFilter.value) || feed.title.match(feedsFilter.value)
			}),
			[
				{ value: (feed) => feed.id },
				{ value: (feed) => feed.name },
				{ value: (feed) => feed.title },
				{
					value: (feed) =>
						sources.filter((source) => source.feeds.map((f) => f.id).includes(feed.id)).length
				},
				{
					element: (feed) => {
						const checkbox = document.createElement('input')
						checkbox.type = 'checkbox'
						checkbox.setAttribute('role', 'switch')
						checkbox.checked = feed.enabled
						checkbox.addEventListener('change', async () => {
							await setFeed({ ...feed, enabled: checkbox.checked })
						})

						return checkbox
					}
				},
				{
					element: (feed) => {
						const a = document.createElement('a')
						a.target = '_blank'
						a.href = `/feed/${feed.name}`
						a.innerText = 'show'

						return a
					}
				},
				{
					element: (feed) => {
						const button = document.createElement('button')
						button.innerText = 'edit'
						button.classList.add('secondary')

						const deleteButton = document.createElement('button')
						deleteButton.classList.add('secondary')
						deleteButton.type = 'button'
						deleteButton.innerText = 'Delete'
						deleteButton.addEventListener('click', async () => {
							if (confirm(`Delete #${feed.id}`)) {
								const response = await fetch(`/api/feed/${feed.id}`, { method: 'DELETE' })

								if (response.ok) {
									modal.setAttribute('open', false)
									update()
								}
							}
						})

						button.addEventListener('click', () =>
							openModal(
								`Edit Feed #${feed.id}`,
								[
									{ label: 'name', type: 'input', value: feed.name },
									{ label: 'title', type: 'input', value: feed.title },
									{ label: 'description', type: 'textarea', value: feed.description },
									{ label: 'enabled', type: 'switch', value: feed.enabled },
									{ type: 'element', element: deleteButton },
									{
										type: 'element',
										element: createTable(['#', 'source', 'enabled'], sources, [
											{ value: (source) => `${source.id}` },
											{ value: (source) => `<${source.name}> ${source.address}` },
											{
												element: (source) => {
													const checkbox = document.createElement('input')
													checkbox.type = 'checkbox'
													checkbox.role = 'switch'
													checkbox.name = `source-${source.id}`
													checkbox.checked = source.feeds.map((f) => f.id).includes(feed.id)

													return checkbox
												}
											}
										])
									}
								],
								async (data) => {
									const feedSources = Object.keys(data)
										.filter((key) => key.match(/^source-/))
										.map((key) => [parseInt(key.replace(/^source-(.*)$/, '$1')), data[key]])

									for (const [id, enabled] of feedSources) {
										const source = sources.find((s) => s.id === id)
										const sourceFeeds = source.feeds.map((f) => f.id)

										if (enabled) {
											if (!sourceFeeds.includes(feed.id)) {
												sourceFeeds.push(feed.id)
											}
										} else {
											if (sourceFeeds.includes(feed.id)) {
												const findex = sourceFeeds.indexOf(feed.id)
												sourceFeeds.splice(findex, 1)
											}
										}

										await setSource({ id, feeds: sourceFeeds })
									}

									const response = await setFeed({
										id: feed.id,
										name: data.name,
										title: data.title,
										description: data.description,
										enabled: data.enabled
									})

									update()

									return true
								}
							)
						)

						return button
					}
				}
			]
		)
	)

	const sourceContainer = document.querySelector('#sources main')
	sourceContainer.innerHTML = ''
	sourceContainer.appendChild(
		createTable(
			['#', 'name', 'address', 'feeds', 'articles', 'enabled', ''],
			sources.filter((source) => {
				if (sourcesFilter.value === '') {
					return true
				}

				return source.address.match(sourcesFilter.value) || source.name.match(sourcesFilter.value)
			}),
			[
				{ value: (source) => source.id },
				{ value: (source) => source.name },
				{ value: (source) => source.address },
				{ value: (source) => source.feeds.length },
				{ value: (source) => articles.filter((article) => article.source === source.id).length },
				{
					element: (source) => {
						const checkbox = document.createElement('input')
						checkbox.type = 'checkbox'
						checkbox.setAttribute('role', 'switch')
						checkbox.checked = source.enabled
						checkbox.addEventListener('change', async () => {
							await setSource({
								id: source.id,
								enabled: checkbox.checked,
								feeds: source.feeds.map((f) => f.id)
							})
						})

						return checkbox
					}
				},
				{
					element: (source) => {
						const button = document.createElement('button')
						button.innerText = 'edit'
						button.classList.add('secondary')

						button.addEventListener('click', () =>
							openModal(
								`Edit Source #${source.id}`,
								[
									{ label: 'enabled', type: 'switch', value: source.enabled },
									{
										type: 'element',
										element: createTable(['#', 'feed', 'enabled'], feeds, [
											{ value: (feed) => `${feed.id}` },
											{ value: (feed) => `${feed.name}` },
											{
												element: (feed) => {
													const checkbox = document.createElement('input')
													checkbox.type = 'checkbox'
													checkbox.role = 'switch'
													checkbox.name = `feed-${feed.id}`
													checkbox.checked = source.feeds.map((f) => f.id).includes(feed.id)

													return checkbox
												}
											}
										])
									}
								],
								async (data) => {
									const sourceFeeds = Object.keys(data)
										.filter((key) => key.match(/^feed-/))
										.map((key) => [parseInt(key.replace(/^feed-(.*)$/, '$1')), data[key]])

									const response = await setSource({
										id: source.id,
										enabled: data.enabled,
										feeds: sourceFeeds.filter(([_, enabled]) => enabled).map(([id]) => id)
									})

									update()

									return true
								}
							)
						)

						return button
					}
				}
			]
		)
	)

	const articleContainer = document.querySelector('#articles main')
	articleContainer.innerHTML = ''
	articleContainer.appendChild(
		createTable(
			['#', 'title', 'source', 'hidden', ''],
			articles.filter((article) => {
				if (articlesFilter.value === '') {
					return true
				}

				return article.title.match(articlesFilter.value)
			}),
			[
				{ value: (article) => article.id },
				{ value: (article) => article.title },
				{ value: (article) => article.source },
				{
					element: (article) => {
						const checkbox = document.createElement('input')
						checkbox.type = 'checkbox'
						checkbox.setAttribute('role', 'switch')
						checkbox.checked = article.hidden
						checkbox.addEventListener('change', async () => {
							await setArticle({ id: article.id, hidden: checkbox.checked })
						})

						return checkbox
					}
				},
				{
					element: (article) => {
						const a = document.createElement('a')
						a.target = '_blank'
						a.href = `/article/${article.uid}`
						a.innerText = 'show'

						return a
					}
				}
			]
		)
	)
}

document.addEventListener('DOMContentLoaded', async () => {
	await update()
	document.querySelector('#add-feed').addEventListener('click', () => {
		openModal(
			'Create Feed',
			[
				{ label: 'name', type: 'text' },
				{ label: 'title', type: 'text' },
				{ label: 'description', type: 'textarea' },
				{ label: 'enabled', type: 'switch' },
				{
					type: 'element',
					element: createTable(['#', 'source', 'enabled'], sources, [
						{ value: (source) => `${source.id}` },
						{ value: (source) => `<${source.name}> ${source.address}` },
						{
							element: (source) => {
								const checkbox = document.createElement('input')
								checkbox.type = 'checkbox'
								checkbox.role = 'switch'
								checkbox.name = `source-${source.id}`

								return checkbox
							}
						}
					])
				}
			],
			async (data) => {
				const sources = Object.keys(data)
					.filter((key) => key.match(/^source-/))
					.map((key) => [parseInt(key.replace(/^source-(.*)$/, '$1')), data[key]])

				const response = await fetch('/api/feed', {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						name: data.name,
						title: data.title,
						description: data.description,
						enabled: data.enabled
					})
				})

				if (!response.ok) {
					return await response.json()
				}

				update()

				return true
			}
		)
	})

	feedsFilter.addEventListener('keyup', update)
	sourcesFilter.addEventListener('keyup', update)
	articlesFilter.addEventListener('keyup', update)

	document
		.querySelector('#modal footer button.secondary')
		.addEventListener('click', () => modal.setAttribute('open', false))
})
