import streamlit as st
from utils.pdf_upload import process_document
from utils.request_rag import initialize_rag_instance
from utils.request_rag import call_rag_api
from utils.chat import (
    summarize_document, 
    get_chat_response,
    document_based_qa_with_memory, 
    stream_chat_response_with_memory,
    get_rag_tools,
    process_rag_response
)
from utils.sidebar import render_sidebar, save_message_to_db, save_document_to_db, load_session_data
import requests
import json
import time
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

if 'initialized' not in st.session_state:
    st.session_state.initialized = True
    initialize_rag_instance()

# Page & Session setup
st.set_page_config(
    page_title="AI Document Assistant",
    page_icon="🤖",
    layout="wide"
)

# 세션 상태 초기화
if "messages" not in st.session_state:
    st.session_state.messages = []
if "processed_pdf" not in st.session_state:
    st.session_state.processed_pdf = None
if "pdf_summary" not in st.session_state:
    st.session_state.pdf_summary = None

# 사이드바 렌더링
render_sidebar()

# 현재 세션의 데이터 로드 (세션이 변경된 경우)
if "current_session_id" in st.session_state:
    # 세션 변경 감지를 위한 이전 세션 ID 저장
    if "prev_session_id" not in st.session_state:
        st.session_state.prev_session_id = st.session_state.current_session_id
        load_session_data(st.session_state.current_session_id)
    elif st.session_state.prev_session_id != st.session_state.current_session_id:
        st.session_state.prev_session_id = st.session_state.current_session_id
        load_session_data(st.session_state.current_session_id)

# API 설정
API_KEY = os.getenv("UPSTAGE_API_KEY")
API_URL = os.getenv("UPSTAGE_API_URL", "https://api.upstage.ai/v1")

if not API_KEY:
    st.error("UPSTAGE_API_KEY 환경 변수가 설정되지 않았습니다.")
    st.stop()

def main():
    st.title("🤖 AI Document Assistant")
    
    # 현재 활성 문서 상태 표시
    if hasattr(st.session_state, 'processed_pdf') and st.session_state.processed_pdf:
        # 현재 세션의 문서 정보 가져오기
        current_session_id = st.session_state.get("current_session_id")
        document_info = None
        
        if current_session_id:
            from utils.database import db
            document_info = db.get_document(current_session_id)
        
        # 문서 상태바 표시
        st.markdown("---")
        col_doc1, col_doc2, col_doc3 = st.columns([3, 1, 1])
        
        with col_doc1:
            if document_info and document_info.get('filename'):
                st.success(f"📄 **활성 문서:** {document_info['filename']}")
            else:
                st.success("📄 **활성 문서:** PDF 문서가 업로드됨")
        
        with col_doc2:
            st.info("🔄 **RAG 활성화**")
        
        with col_doc3:
            pass
            # if st.button("📁 문서 정보", help="현재 문서의 상세 정보를 확인합니다"):
            #     with st.expander("📋 문서 세부정보", expanded=True):
            #         if document_info:
            #             st.write(f"**파일명:** {document_info.get('filename', 'Unknown')}")
            #             st.write(f"**업로드 시간:** {document_info.get('uploaded_at', 'Unknown')}")
                        
            #             if document_info.get('summary'):
            #                 st.write("**문서 요약:**")
            #                 st.write(document_info['summary'][:200] + "..." if len(document_info['summary']) > 200 else document_info['summary'])
            #         else:
            #             st.write("**문서가 이 세션에서 활성화되어 있습니다.**")
            #             st.write("후속 질문들은 이 문서를 기반으로 답변됩니다.")
        
        st.markdown("---")

    # 채팅 히스토리 표시
    chat_container = st.container()
    with chat_container:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # 입력 폼
    with st.form("chat_pdf_form", clear_on_submit=True):
        # 문서 상태에 따른 UI 조정
        has_active_document = hasattr(st.session_state, 'processed_pdf') and st.session_state.processed_pdf
        
        if has_active_document:
            # 활성 문서가 있을 때: 텍스트 입력에 더 많은 공간 할당
            col1, col2 = st.columns([1.5, 3.5])
            
            with col1:
                st.markdown("**📄 문서 활성**")
                uploaded_file = st.file_uploader(
                    "새 PDF 업로드", 
                    type=["pdf"],
                    help="새로운 PDF를 업로드하면 기존 문서를 대체합니다",
                    key="new_upload"
                )
                if uploaded_file:
                    st.warning("⚠️ 새 문서가 기존 문서를 대체합니다")
            
            with col2:
                user_input = st.text_area(
                    f"💬 현재 문서 기반 질문",
                    height=100,
                    placeholder="현재 업로드된 문서를 기반으로 질문하세요...\n예: '핵심 내용을 설명해줘', '이 문서에서 중요한 부분은?'"
                )
        else:
            # 활성 문서가 없을 때: 기존 UI 유지
            col1, col2 = st.columns([2, 3])
            
            with col1:
                uploaded_file = st.file_uploader(
                    "📄 PDF Upload", 
                    type=["pdf"],
                    help="Upload PDF file to analyze",
                )
            
            with col2:
                user_input = st.text_area(
                    "💬 Message",
                    height=100,
                    placeholder="질문이나 요청사항을 입력하세요...\n예: '이 문서를 요약해줘', '주요 내용이 뭐야?'"
                )
        
        # 옵션 설정
        col_opt1, col_opt2, col_opt3 = st.columns(3)
        with col_opt1:
            force_ocr = st.checkbox("Force OCR", value=False, help="Check if PDF is image-base")
        with col_opt2:
            use_streaming = st.checkbox("Streaming response", value=True, help="Get streaming response")
        with col_opt3:
            use_rag = st.checkbox("Use RAG", value=True, help="Use RAG for additional context")
        
        submitted = st.form_submit_button("📤 SUBMIT", use_container_width=True)

    # 메시지 처리 - 폼이 제출되었을 때 실행
    if submitted:
        # 케이스 판단
        has_pdf = uploaded_file is not None
        has_text = user_input is not None and user_input.strip() != ""
        
        if has_pdf and has_text:
            # 케이스 1: PDF + 텍스트 입력
            with st.chat_message("user"):
                st.markdown(f"📄 **Document:** {uploaded_file.name}\n\n💬 **Query:** {user_input}")
            
            user_message = f"📄 **Document:** {uploaded_file.name}\n\n💬 **Query:** {user_input}"
            st.session_state.messages.append({
                "role": "user", 
                "content": user_message
            })
            save_message_to_db("user", user_message)
            
            with st.chat_message("assistant"):
                try:
                    # PDF 처리 (새로 업로드된 경우)
                    if uploaded_file:
                        with st.spinner("Analyzing PDF..."):
                            file_bytes = uploaded_file.read()
                            plain_text, error = process_document(file_bytes, force_ocr)
                            
                            if error:
                                st.error(f"PDF 처리 중 오류가 발생했습니다: {error}")
                                st.stop()
                            
                            if plain_text:
                                st.session_state.processed_pdf = plain_text
                                # 기존 요약 함수 사용
                                summary = summarize_document(plain_text)
                                st.session_state.pdf_summary = summary
                                
                                # 문서 정보를 DB에 저장
                                current_session_id = st.session_state.get("current_session_id")
                                if current_session_id:
                                    from utils.database import db
                                    db.save_document(
                                        session_id=current_session_id,
                                        filename=uploaded_file.name,
                                        content=plain_text,
                                        summary=summary
                                    )
                    
                    # 문서 기반 질문 답변
                    if use_streaming:
                        # 기본 시스템 프롬프트 정의
                        system_prompt = """당신은 도움이 되는 AI 어시스턴트입니다. 
이전 대화 내용을 참고하여 사용자의 질문에 정확하고 유용한 답변을 한국어로 제공해주세요.
대화의 맥락을 이해하고 연속성 있는 답변을 해주세요.
모르는 내용에 대해서는 솔직하게 모른다고 답변해주세요."""
                        
                        # 채팅 응답 생성 (RAG 포함)
                        response_placeholder = st.empty()
                        full_response = ""
                        
                        with st.spinner("답변을 생성하는 중..."):
                            for chunk in stream_chat_response_with_memory(
                                st.session_state.messages[:-1], 
                                system_prompt, 
                                user_input,
                                use_rag=use_rag,
                                pdf_summary=st.session_state.processed_pdf if hasattr(st.session_state, 'processed_pdf') else None
                            ):
                                full_response += chunk
                                response_placeholder.markdown(full_response + "▌")
                        
                        response_placeholder.markdown(full_response)
                        
                        st.session_state.messages.append({
                            "role": "assistant", 
                            "content": full_response
                        })
                        save_message_to_db("assistant", full_response)
                    else:
                        # 일반 응답
                        with st.spinner("문서 기반 답변을 생성하는 중..."):
                            system_prompt = """당신은 도움이 되는 AI 어시스턴트입니다. 
이전 대화 내용을 참고하여 사용자의 질문에 정확하고 유용한 답변을 한국어로 제공해주세요.
대화의 맥락을 이해하고 연속성 있는 답변을 해주세요.
모르는 내용에 대해서는 솔직하게 모른다고 답변해주세요."""
                            
                            response = get_chat_response(
                                st.session_state.messages[:-1],
                                system_prompt,
                                user_input,
                                use_rag=use_rag,
                                pdf_summary=st.session_state.processed_pdf if hasattr(st.session_state, 'processed_pdf') else None
                            )
                            
                            if response:
                                full_response = response["response"]
                                if response["reference"]:
                                    full_response += f"\n\n---\n\n참조 문서 요약:\n{response['reference']}"
                                
                                st.markdown(full_response)
                                
                                st.session_state.messages.append({
                                    "role": "assistant", 
                                    "content": full_response
                                })
                                save_message_to_db("assistant", full_response)
                            else:
                                st.error("응답을 생성하는 중에 오류가 발생했습니다.")
                    
                except Exception as e:
                    st.error(f"처리 중 오류가 발생했습니다: {str(e)}")
        
        elif not has_pdf and has_text:
            # 케이스 2: 텍스트만 입력
            with st.chat_message("user"):
                st.markdown(user_input)
            
            st.session_state.messages.append({
                "role": "user", 
                "content": user_input
            })
            save_message_to_db("user", user_input)
            
            with st.chat_message("assistant"):
                try:
                    if use_streaming:
                        # 기본 시스템 프롬프트 정의
                        system_prompt = """당신은 도움이 되는 AI 어시스턴트입니다. 
이전 대화 내용을 참고하여 사용자의 질문에 정확하고 유용한 답변을 한국어로 제공해주세요.
대화의 맥락을 이해하고 연속성 있는 답변을 해주세요.
모르는 내용에 대해서는 솔직하게 모른다고 답변해주세요."""
                        
                        # 채팅 응답 생성 (RAG 포함)
                        response_placeholder = st.empty()
                        full_response = ""
                        
                        with st.spinner("답변을 생성하는 중..."):
                            for chunk in stream_chat_response_with_memory(
                                st.session_state.messages[:-1],
                                system_prompt,
                                user_input,
                                use_rag=use_rag,
                                pdf_summary=st.session_state.processed_pdf if hasattr(st.session_state, 'processed_pdf') else None
                            ):
                                full_response += chunk
                                response_placeholder.markdown(full_response + "▌")
                        
                        response_placeholder.markdown(full_response)
                        
                        st.session_state.messages.append({
                            "role": "assistant", 
                            "content": full_response
                        })
                        save_message_to_db("assistant", full_response)
                    else:
                        # 일반 응답
                        with st.spinner("답변을 생성하는 중..."):
                            system_prompt = """당신은 도움이 되는 AI 어시스턴트입니다. 
이전 대화 내용을 참고하여 사용자의 질문에 정확하고 유용한 답변을 한국어로 제공해주세요.
대화의 맥락을 이해하고 연속성 있는 답변을 해주세요.
모르는 내용에 대해서는 솔직하게 모른다고 답변해주세요."""
                            
                            response = get_chat_response(
                                st.session_state.messages[:-1],
                                system_prompt,
                                user_input,
                                use_rag=use_rag,
                                pdf_summary=st.session_state.processed_pdf if hasattr(st.session_state, 'processed_pdf') else None
                            )
                            
                            if response:
                                full_response = response["response"]
                                if response["reference"]:
                                    full_response += f"\n\n---\n\n참조 문서 요약:\n{response['reference']}"
                                
                                st.markdown(full_response)
                                
                                st.session_state.messages.append({
                                    "role": "assistant", 
                                    "content": full_response
                                })
                                save_message_to_db("assistant", full_response)
                            else:
                                st.error("응답을 생성하는 중에 오류가 발생했습니다.")
                    
                except Exception as e:
                    st.error(f"처리 중 오류가 발생했습니다: {str(e)}")
        
        elif has_pdf and not has_text:
            # 케이스 3: PDF만 업로드
            with st.chat_message("user"):
                st.markdown(f"📄 **PDF 파일 업로드:** {uploaded_file.name}")
            
            user_message = f"📄 PDF 파일 업로드: {uploaded_file.name}"
            st.session_state.messages.append({
                "role": "user", 
                "content": user_message
            })
            save_message_to_db("user", user_message)
            
            with st.chat_message("assistant"):
                try:
                    # PDF 처리
                    with st.spinner("PDF 분석 중..."):
                        file_bytes = uploaded_file.read()
                        plain_text, error = process_document(file_bytes, force_ocr)
                        
                        if error:
                            st.error(f"PDF 처리 중 오류가 발생했습니다: {error}")
                            st.stop()
                        
                        if plain_text:
                            st.session_state.processed_pdf = plain_text
                            # 문서 요약 생성
                            summary = summarize_document(plain_text)
                            st.session_state.pdf_summary = summary
                            
                            # 문서 정보를 DB에 저장
                            current_session_id = st.session_state.get("current_session_id")
                            if current_session_id:
                                from utils.database import db
                                db.save_document(
                                    session_id=current_session_id,
                                    filename=uploaded_file.name,
                                    content=plain_text,
                                    summary=summary
                                )
                            
                            # 자동 응답 생성
                            auto_response = f"""📄 **PDF 분석 완료!**

**파일:** {uploaded_file.name}

**문서 요약:**
{summary}

이제 이 문서에 대해 질문하실 수 있습니다. 예를 들어:
- "이 문서의 핵심 내용을 설명해줘"
- "주요 결론이 무엇인가요?"
- "이 문서에서 중요한 데이터는?"

RAG 기능이 활성화되어 관련된 다른 자료도 함께 검색하여 답변드립니다."""
                            
                            st.markdown(auto_response)
                            
                            st.session_state.messages.append({
                                "role": "assistant", 
                                "content": auto_response
                            })
                            save_message_to_db("assistant", auto_response)
                        else:
                            st.error("PDF에서 텍스트를 추출할 수 없습니다.")
                    
                except Exception as e:
                    st.error(f"PDF 처리 중 오류가 발생했습니다: {str(e)}")
        
        else:
            # 케이스 4: 아무것도 입력하지 않음
            st.warning("⚠️ PDF 파일을 업로드하거나 메시지를 입력해주세요.")

if __name__ == "__main__":
    main()

# 하단 정보
st.markdown("---")
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("🗑️ 현재 세션 초기화"):
        st.session_state.messages = []
        st.session_state.processed_pdf = None
        st.session_state.pdf_summary = None
        # DB에서도 현재 세션의 메시지만 삭제
        current_session_id = st.session_state.get("current_session_id")
        if current_session_id:
            from utils.database import db
            import sqlite3
            # 메시지만 삭제 (세션과 문서는 유지)
            with sqlite3.connect(db.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM messages WHERE session_id = ?", (current_session_id,))
                cursor.execute("UPDATE sessions SET message_count = 0 WHERE session_id = ?", (current_session_id,))
                conn.commit()
        st.rerun()

with col2:
    st.markdown("**📄 문서 상태:**")
    if hasattr(st.session_state, 'processed_pdf') and st.session_state.processed_pdf:
        current_session_id = st.session_state.get("current_session_id")
        if current_session_id:
            from utils.database import db
            document_info = db.get_document(current_session_id)
            if document_info:
                st.success(f"📄 {document_info['filename']}")
            else:
                st.success("📄 활성 문서 존재")
        else:
            st.success("📄 문서 활성화됨")
    else:
        st.info("📄 문서 없음")

with col3:
    st.markdown("**💬 대화 현황:**")
    message_count = len(st.session_state.messages)
    if message_count > 0:
        st.info(f"💬 {message_count}개 메시지")
        if hasattr(st.session_state, 'processed_pdf') and st.session_state.processed_pdf:
            st.success("🔄 RAG 활성")
    else:
        st.info("💬 대화 없음")

# 푸터
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center; color: #666; font-size: 0.8em;'>
    🤖 Powered by Upstage Solar Pro2 Preview | OpenAI Compatible API
    </div>
    """, 
    unsafe_allow_html=True
)

# RAG 함수 정의
def search_rag_documents(query):
    """RAG 시스템에서 관련 문서를 검색합니다."""
    try:
        rag_response = call_rag_api(query)
        if rag_response and "results" in rag_response and rag_response["results"]:
            return json.dumps(rag_response["results"][:3])
        return json.dumps([])
    except Exception as e:
        return json.dumps({"error": str(e)})

# 문서 요약 함수 정의
def summarize_document_content(content):
    """문서 내용을 간단히 요약합니다."""
    try:
        response = requests.post(
            f"{API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "solar-pro-preview",
                "messages": [
                    {"role": "system", "content": "문서의 내용을 1-2줄로 간단히 요약해주세요."},
                    {"role": "user", "content": content[:1000]}  # 처음 1000자만 사용
                ]
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            return "문서 요약을 생성할 수 없습니다."
    except Exception as e:
        return "문서 요약을 생성할 수 없습니다."

